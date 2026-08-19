import os
import re
from uuid import uuid4
from fastapi import FastAPI, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from datetime import timedelta

from . import models, schemas, auth
from .database import engine, get_db, Base
from .payments import router as payments_router
from .whatsapp import router as whatsapp_router, send_whatsapp_message
from fastapi import Body

app = FastAPI(title="Sauti Biashara API")

KPI_DEFINITIONS = [
    {
        "key": "net_profit_margin",
        "name": "Net Profit Margin",
        "description": "Net profit as a percentage of total revenue.",
        "unit": "%",
    },
    {
        "key": "gross_profit_margin",
        "name": "Gross Profit Margin",
        "description": "Gross profit as a percentage of total revenue.",
        "unit": "%",
    },
    {
        "key": "inventory_turnover_ratio",
        "name": "Inventory Turnover Ratio",
        "description": "How quickly inventory is sold and replaced over a period.",
        "unit": "times",
    },
    {
        "key": "sales_growth_rate",
        "name": "Sales Growth Rate",
        "description": "Percentage increase in sales over the previous period.",
        "unit": "%",
    },
    {
        "key": "inventory_cash",
        "name": "Inventory Cash",
        "description": "Cash value tied up in inventory stock.",
        "unit": "TZS",
    },
    {
        "key": "cash_balance",
        "name": "Cash Balance",
        "description": "Current cash available in the business or POS register.",
        "unit": "TZS",
    },
]

async def ensure_kpi_defs(db: AsyncSession):
    for definition in KPI_DEFINITIONS:
        existing = await db.execute(text("SELECT id FROM kpis WHERE `key` = :key"), {"key": definition["key"]})
        if not existing.first():
            await db.execute(
                text(
                    "INSERT INTO kpis (`key`, name, description, unit) "
                    "VALUES (:key, :name, :description, :unit)"
                ),
                {
                    "key": definition["key"],
                    "name": definition["name"],
                    "description": definition["description"],
                    "unit": definition["unit"],
                },
            )
    await db.commit()


DEFAULT_INVENTORY_ITEMS = [
    {
        "sku": "SKU-001",
        "name": "Rice 5kg",
        "category": "Groceries",
        "cost_price": 6500,
        "selling_price": 8000,
        "stock_quantity": 40,
        "reorder_level": 8,
    },
    {
        "sku": "SKU-002",
        "name": "Cooking Oil 1L",
        "category": "Groceries",
        "cost_price": 3200,
        "selling_price": 4200,
        "stock_quantity": 24,
        "reorder_level": 6,
    },
    {
        "sku": "SKU-003",
        "name": "Soap Bar",
        "category": "Household",
        "cost_price": 900,
        "selling_price": 1300,
        "stock_quantity": 35,
        "reorder_level": 10,
    },
]


async def ensure_inventory_defaults(db: AsyncSession, user_id: int):
    existing = await db.execute(
        text("SELECT id FROM inventory_items WHERE recorded_by = :user_id LIMIT 1"),
        {"user_id": user_id},
    )
    if existing.first():
        return

    for item in DEFAULT_INVENTORY_ITEMS:
        await db.execute(
            text(
                "INSERT INTO inventory_items (recorded_by, sku, name, category, cost_price, selling_price, stock_quantity, reorder_level) "
                "VALUES (:recorded_by, :sku, :name, :category, :cost_price, :selling_price, :stock_quantity, :reorder_level)"
            ),
            {
                "recorded_by": user_id,
                **item,
            },
        )
    await db.commit()


@app.get("/kpis")
async def list_kpis(db: AsyncSession = Depends(get_db)):
    await ensure_kpi_defs(db)
    result = await db.execute(text("SELECT id, `key`, name, description, unit FROM kpis ORDER BY id"))
    return [dict(row._mapping) for row in result.fetchall()]


def normalize_plan_name(plan_name: str | None) -> str:
    normalized = (plan_name or "basic").strip().lower()
    if normalized in {"free", "basic"}:
        return "basic"
    if normalized in {"pro", "growth", "freemium"}:
        return "freemium"
    if normalized in {"enterprise", "premium"}:
        return "premium"
    return "basic"


def plan_rank(plan_name: str | None) -> int:
    return {"basic": 1, "freemium": 2, "premium": 3}.get(normalize_plan_name(plan_name), 1)


def require_min_plan(current: dict, minimum_plan: str):
    if plan_rank(current.get("plan")) < plan_rank(minimum_plan):
        raise HTTPException(
            status_code=403,
            detail=f"This feature requires a {minimum_plan} plan or higher.",
        )


@app.get("/kpis/dashboard")
async def kpi_dashboard(db: AsyncSession = Depends(get_db), current=Depends(auth.get_current_user)):
    require_min_plan(current, "freemium")
    await ensure_kpi_defs(db)
    query = text(
        "SELECT k.id AS kpi_id, k.`key` AS kpi_key, v.value FROM kpis k "
        "LEFT JOIN kpi_values v ON k.id = v.kpi_id "
        "AND v.recorded_by = :user_id "
        "AND v.id = (SELECT v2.id FROM kpi_values v2 WHERE v2.kpi_id = k.id AND v2.recorded_by = :user_id ORDER BY v2.recorded_at DESC LIMIT 1) "
        "ORDER BY k.id"
    )
    result = await db.execute(query, {"user_id": current["id"]})
    latest = {
        row[1]: {
            "id": row[0],
            "value": float(row[2]) if row[2] is not None else None,
        }
        for row in result.fetchall()
    }
    dashboard = []
    for definition in KPI_DEFINITIONS:
        data = latest.get(definition["key"], {"id": None, "value": None})
        dashboard.append({
            "id": data["id"],
            "key": definition["key"],
            "name": definition["name"],
            "description": definition["description"],
            "unit": definition["unit"],
            "value": data["value"],
        })
    return {"kpis": dashboard}

@app.post("/kpis/compute")
async def compute_kpis(payload: dict = Body(...), db: AsyncSession = Depends(get_db), current=Depends(auth.get_current_user)):
    require_min_plan(current, "freemium")
    await ensure_kpi_defs(db)
    revenue = float(payload.get("revenue", 0) or 0)
    cost_of_goods_sold = float(payload.get("cost_of_goods_sold", 0) or 0)
    inventory_value = float(payload.get("inventory_value", 0) or 0)
    cash_balance = float(payload.get("cash_balance", 0) or 0)
    previous_revenue = payload.get("previous_revenue")
    previous_revenue_value = None
    if previous_revenue is not None:
        try:
            previous_revenue_value = float(previous_revenue)
        except (TypeError, ValueError):
            previous_revenue_value = None

    gross_profit = revenue - cost_of_goods_sold
    gross_profit_margin = 0.0
    net_profit_margin = 0.0
    if revenue > 0:
        gross_profit_margin = (gross_profit / revenue) * 100
        net_profit_margin = gross_profit_margin

    inventory_turnover_ratio = None
    if inventory_value > 0:
        inventory_turnover_ratio = revenue / inventory_value

    sales_growth_rate = None
    if previous_revenue_value and previous_revenue_value > 0:
        sales_growth_rate = ((revenue - previous_revenue_value) / previous_revenue_value) * 100

    computed_values = {
        "gross_profit_margin": gross_profit_margin,
        "net_profit_margin": net_profit_margin,
        "inventory_turnover_ratio": inventory_turnover_ratio,
        "sales_growth_rate": sales_growth_rate,
        "inventory_cash": inventory_value,
        "cash_balance": cash_balance,
    }

    user_label = current.get("full_name") or current.get("email") or f"User {current['id']}"
    previous_revenue_text = f"{previous_revenue_value:.0f}" if previous_revenue_value is not None else "n/a"
    business_context_notes = (
        f"Executive KPI run prepared for {user_label}: revenue {revenue:.0f}, "
        f"COGS {cost_of_goods_sold:.0f}, inventory {inventory_value:.0f}, "
        f"cash balance {cash_balance:.0f}, previous period revenue {previous_revenue_text}."
    )

    for key, value in computed_values.items():
        if value is None:
            continue
        result = await db.execute(text("SELECT id FROM kpis WHERE `key` = :key LIMIT 1"), {"key": key})
        row = result.first()
        if not row:
            continue
        kpi_id = row[0]
        await db.execute(
            text(
                "INSERT INTO kpi_values (kpi_id, recorded_by, value, notes) "
                "VALUES (:kpi_id, :user_id, :value, :notes)"
            ),
            {
                "kpi_id": kpi_id,
                "user_id": current["id"],
                "value": value,
                "notes": business_context_notes,
            },
        )
    await db.commit()
    return {"ok": True}

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    # Create tables if they don't exist (dev convenience)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # Add `plan` column if it does not exist (MySQL-safe check)
        plan_col = await conn.execute(
            text(
                "SELECT COUNT(*) FROM information_schema.COLUMNS "
                "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'plan'"
            )
        )
        if plan_col.fetchone()[0] == 0:
            try:
                await conn.execute(text("ALTER TABLE users ADD COLUMN plan VARCHAR(50) DEFAULT 'freemium'"))
            except Exception:
                pass

        # Add `role` column if it does not exist (MySQL-safe check)
        role_col = await conn.execute(
            text(
                "SELECT COUNT(*) FROM information_schema.COLUMNS "
                "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'role'"
            )
        )
        if role_col.fetchone()[0] == 0:
            try:
                await conn.execute(text("ALTER TABLE users ADD COLUMN role VARCHAR(50) DEFAULT 'user'"))
            except Exception:
                pass

        # Add profile metadata used during registration and staff ownership
        for column_name, ddl in (
            ("username", "ALTER TABLE users ADD COLUMN username VARCHAR(120) NULL"),
            ("company_name", "ALTER TABLE users ADD COLUMN company_name VARCHAR(255) NULL"),
            ("owner_id", "ALTER TABLE users ADD COLUMN owner_id INT NULL"),
        ):
            col = await conn.execute(
                text(
                    "SELECT COUNT(*) FROM information_schema.COLUMNS "
                    "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = :column_name"
                ),
                {"column_name": column_name},
            )
            if col.fetchone()[0] == 0:
                try:
                    await conn.execute(text(ddl))
                except Exception:
                    pass

        # Ensure there's at least one founder (for initial setup)
        result = await conn.execute(text("SELECT COUNT(*) as cnt FROM users WHERE role = 'founder'"))
        founder_exists = result.fetchone()[0] > 0
        if not founder_exists:
            founder_email = os.getenv("FOUNDER_EMAIL", "founder@sauti-biashara.local")
            founder_pass = os.getenv("FOUNDER_PASSWORD", "FounderSecurePass123!")
            hashed = auth.get_password_hash(founder_pass)
            try:
                await conn.execute(
                    text("INSERT INTO users (email, phone, password_hash, full_name, role, plan) VALUES (:email, :phone, :hash, :name, 'founder', 'premium')"),
                    {"email": founder_email, "phone": None, "hash": hashed, "name": "Founder Admin"}
                )
            except Exception:
                pass


app.include_router(payments_router)
app.include_router(whatsapp_router)


@app.post("/kpis/{kpi_id}/values")
async def record_kpi_value(kpi_id: int, payload: dict = Body(...), db: AsyncSession = Depends(get_db), current=Depends(auth.get_current_user)):
    require_min_plan(current, "freemium")
    # payload: {value, notes}
    await db.execute(text("INSERT INTO kpi_values (kpi_id, recorded_by, value, notes) VALUES (:kpi_id, :user_id, :value, :notes)"),
                     {"kpi_id": kpi_id, "user_id": current["id"], "value": payload.get("value"), "notes": payload.get("notes")})
    await db.commit()
    return {"ok": True}


@app.get("/kpis/history")
async def kpi_history(limit: int = 200, sort: str = "desc", kpi_id: int | None = None, db: AsyncSession = Depends(get_db), current=Depends(auth.get_current_user)):
    require_min_plan(current, "freemium")
    order = "DESC" if sort.lower() != "asc" else "ASC"
    base_query = (
        "SELECT kv.id, k.id AS kpi_id, k.name AS kpi_name, k.key AS kpi_key, k.unit AS kpi_unit, kv.value, kv.notes, kv.recorded_at, u.full_name, u.email "
        "FROM kpi_values kv "
        "JOIN kpis k ON k.id = kv.kpi_id "
        "LEFT JOIN users u ON u.id = kv.recorded_by "
        "WHERE kv.recorded_by = :user_id "
    )
    params = {"user_id": current["id"], "limit": limit}
    if kpi_id is not None:
        base_query += "AND k.id = :kpi_id "
        params["kpi_id"] = kpi_id

    query = text(base_query + f"ORDER BY kv.recorded_at {order} LIMIT :limit")
    result = await db.execute(query, params)
    rows = result.fetchall()
    history = []
    for row in rows:
        _id, kpi_id, kpi_name, kpi_key, kpi_unit, value, notes, recorded_at, full_name, email = row
        history.append({
            "id": _id,
            "kpiId": kpi_id,
            "kpiName": kpi_name,
            "kpiKey": kpi_key,
            "kpiUnit": kpi_unit,
            "value": float(value),
            "notes": notes,
            "recorded_at": recorded_at.isoformat() if recorded_at is not None else None,
            "recorded_by_name": full_name or email or f"User {current['id']}",
        })
    return {"history": history}


@app.get("/kpis/{kpi_id}/values")
async def kpi_values_history(kpi_id: int, limit: int = 50, db: AsyncSession = Depends(get_db), current=Depends(auth.get_current_user)):
    require_min_plan(current, "freemium")
    # Return recent KPI values for the authenticated user
    result = await db.execute(
        text(
            "SELECT kv.id, kv.value, kv.notes, kv.recorded_at, u.full_name, u.email "
            "FROM kpi_values kv "
            "LEFT JOIN users u ON u.id = kv.recorded_by "
            "WHERE kv.kpi_id = :kpi_id AND kv.recorded_by = :user_id "
            "ORDER BY kv.recorded_at DESC LIMIT :limit"
        ),
        {"kpi_id": kpi_id, "user_id": current["id"], "limit": limit},
    )
    rows = result.fetchall()
    values = []
    for row in rows:
        _id, value, notes, recorded_at, full_name, email = row
        values.append({
            "id": _id,
            "value": float(value),
            "notes": notes,
            "recorded_at": recorded_at.isoformat() if recorded_at is not None else None,
            "recorded_by_name": full_name or email or f"User {current['id']}",
        })
    return {"values": values}


@app.get("/inventory/items")
async def list_inventory_items(db: AsyncSession = Depends(get_db), current=Depends(auth.get_current_user)):
    require_min_plan(current, "freemium")
    await ensure_inventory_defaults(db, current["id"])
    result = await db.execute(
        text(
            "SELECT id, sku, name, category, cost_price, selling_price, stock_quantity, reorder_level, is_active, updated_at "
            "FROM inventory_items WHERE recorded_by = :user_id ORDER BY name"
        ),
        {"user_id": current["id"]},
    )
    rows = result.fetchall()
    items = []
    for row in rows:
        _id, sku, name, category, cost_price, selling_price, stock_quantity, reorder_level, is_active, updated_at = row
        items.append({
            "id": _id,
            "sku": sku,
            "name": name,
            "category": category,
            "cost_price": float(cost_price),
            "selling_price": float(selling_price),
            "stock_quantity": stock_quantity,
            "reorder_level": reorder_level,
            "is_active": is_active,
            "updated_at": updated_at.isoformat() if updated_at is not None else None,
        })
    return {"items": items}


@app.get("/inventory/alerts")
async def low_stock_inventory(db: AsyncSession = Depends(get_db), current=Depends(auth.get_current_user)):
    require_min_plan(current, "freemium")
    result = await db.execute(
        text(
            "SELECT id, sku, name, stock_quantity, reorder_level, selling_price "
            "FROM inventory_items WHERE recorded_by = :user_id AND stock_quantity <= reorder_level ORDER BY stock_quantity ASC"
        ),
        {"user_id": current["id"]},
    )
    rows = result.fetchall()
    return {"alerts": [
        {
            "id": row[0],
            "sku": row[1],
            "name": row[2],
            "stock_quantity": row[3],
            "reorder_level": row[4],
            "selling_price": float(row[5]),
        } for row in rows
    ]}


def generate_inventory_sku(name: str) -> str:
    slug = re.sub(r"[^A-Za-z0-9]+", "-", name.strip().upper()).strip("-") or "ITEM"
    return f"SKU-{slug}-{uuid4().hex[:6].upper()}"


@app.post("/inventory/items")
async def create_inventory_item(payload: dict = Body(...), db: AsyncSession = Depends(get_db), current=Depends(auth.get_current_user)):
    require_min_plan(current, "freemium")
    name = str(payload.get("name", "")).strip()
    if not name:
        raise HTTPException(status_code=400, detail="Name is required")

    sku = str(payload.get("sku", "")).strip() or ""
    if not sku:
        sku = generate_inventory_sku(name)

    existing = await db.execute(
        text("SELECT id FROM inventory_items WHERE recorded_by = :user_id AND sku = :sku LIMIT 1"),
        {"user_id": current["id"], "sku": sku},
    )
    if existing.first():
        sku = generate_inventory_sku(name)

    await db.execute(
        text(
            "INSERT INTO inventory_items (recorded_by, sku, name, category, cost_price, selling_price, stock_quantity, reorder_level) "
            "VALUES (:user_id, :sku, :name, :category, :cost_price, :selling_price, :stock_quantity, :reorder_level)"
        ),
        {
            "user_id": current["id"],
            "sku": sku,
            "name": name,
            "category": payload.get("category") or "General",
            "cost_price": float(payload.get("cost_price") or 0),
            "selling_price": float(payload.get("selling_price") or 0),
            "stock_quantity": int(payload.get("stock_quantity") or 0),
            "reorder_level": int(payload.get("reorder_level") or 0),
        },
    )
    await db.commit()
    return {"ok": True, "sku": sku}


@app.post("/inventory/items/{item_id}/adjust")
async def adjust_inventory_item(item_id: int, payload: dict = Body(...), db: AsyncSession = Depends(get_db), current=Depends(auth.get_current_user)):
    require_min_plan(current, "freemium")
    quantity_change = int(payload.get("quantity_change") or 0)
    if quantity_change == 0:
        raise HTTPException(status_code=400, detail="Quantity change is required")

    current_stock = await db.execute(
        text("SELECT stock_quantity FROM inventory_items WHERE id = :item_id AND recorded_by = :user_id LIMIT 1"),
        {"item_id": item_id, "user_id": current["id"]},
    )
    stock_row = current_stock.first()
    if not stock_row:
        raise HTTPException(status_code=404, detail="Inventory item not found")

    new_quantity = int(stock_row[0]) + quantity_change
    if new_quantity < 0:
        raise HTTPException(status_code=400, detail="Stock cannot go below zero")

    await db.execute(
        text(
            "UPDATE inventory_items SET stock_quantity = :new_quantity, updated_at = CURRENT_TIMESTAMP WHERE id = :item_id AND recorded_by = :user_id"
        ),
        {"new_quantity": new_quantity, "item_id": item_id, "user_id": current["id"]},
    )
    await db.execute(
        text(
            "INSERT INTO inventory_movements (item_id, recorded_by, movement_type, quantity_change, notes) VALUES (:item_id, :user_id, :movement_type, :quantity_change, :notes)"
        ),
        {
            "item_id": item_id,
            "user_id": current["id"],
            "movement_type": payload.get("movement_type") or ("restock" if quantity_change > 0 else "adjustment"),
            "quantity_change": quantity_change,
            "notes": payload.get("notes") or "Inventory update",
        },
    )
    await db.commit()
    return {"ok": True}


@app.post("/sales")
async def record_sale(payload: dict = Body(...), db: AsyncSession = Depends(get_db), current=Depends(auth.get_current_user)):
    require_min_plan(current, "basic")
    # payload: {amount_cents, currency, notes, items: [{item_id, quantity}]}
    line_items = payload.get("items") or []
    currency = str(payload.get("currency") or "TZS").upper()
    notes = payload.get("notes")
    amount_cents = payload.get("amount_cents")

    if line_items:
        total_amount_cents = 0
        for item_payload in line_items:
            item_id = int(item_payload.get("item_id"))
            quantity = int(item_payload.get("quantity") or 0)
            if quantity <= 0:
                raise HTTPException(status_code=400, detail="Item quantity must be greater than zero")

            item_result = await db.execute(
                text(
                    "SELECT id, selling_price, stock_quantity, name FROM inventory_items WHERE id = :item_id AND recorded_by = :user_id LIMIT 1"
                ),
                {"item_id": item_id, "user_id": current["id"]},
            )
            item_row = item_result.first()
            if not item_row:
                raise HTTPException(status_code=404, detail="Inventory item not found")

            _item_id, selling_price, stock_quantity, name = item_row
            if stock_quantity < quantity:
                raise HTTPException(status_code=400, detail=f"Not enough stock for {name}")

            total_amount_cents += int(round(float(selling_price) * quantity * 100))

            await db.execute(
                text(
                    "UPDATE inventory_items SET stock_quantity = stock_quantity - :quantity, updated_at = CURRENT_TIMESTAMP WHERE id = :item_id AND recorded_by = :user_id"
                ),
                {"quantity": quantity, "item_id": item_id, "user_id": current["id"]},
            )
            await db.execute(
                text(
                    "INSERT INTO inventory_movements (item_id, recorded_by, movement_type, quantity_change, notes) VALUES (:item_id, :user_id, 'sale', :quantity_change, :notes)"
                ),
                {
                    "item_id": item_id,
                    "user_id": current["id"],
                    "quantity_change": -quantity,
                    "notes": f"Sold {quantity} unit(s) from POS transaction",
                },
            )
        amount_cents = total_amount_cents

    await db.execute(
        text(
            "INSERT INTO sales (recorded_by, amount_cents, currency, notes) VALUES (:user_id, :amount_cents, :currency, :notes)"
        ),
        {
            "user_id": current["id"],
            "amount_cents": amount_cents or 0,
            "currency": currency,
            "notes": notes,
        },
    )
    await db.commit()
    return {"ok": True}


@app.post("/whatsapp/send")
async def whatsapp_send(payload: dict = Body(...), current=Depends(auth.get_current_user)):
    # payload: {to, text}
    res = await send_whatsapp_message(payload.get("to"), payload.get("text"))
    return res


@app.post("/auth/register", response_model=schemas.UserOut)
async def register(user_in: schemas.UserCreate, db: AsyncSession = Depends(get_db)):
    email = str(user_in.email or "").strip().lower() if user_in.email else None
    phone = str(user_in.phone or "").strip() if user_in.phone else None
    username = str(user_in.username or "").strip().lower() if user_in.username else None
    company_name = str(user_in.company_name or "").strip() if user_in.company_name else None
    full_name = str(user_in.full_name or "").strip() if user_in.full_name else None
    plan_value = normalize_plan_name(user_in.plan)
    confirm_password = str(user_in.confirm_password or "")

    if not (email or phone):
        raise HTTPException(status_code=400, detail="email or phone required")
    if not full_name:
        raise HTTPException(status_code=400, detail="Full name is required")
    if not username:
        raise HTTPException(status_code=400, detail="Username is required")
    if not company_name:
        raise HTTPException(status_code=400, detail="Company or shop name is required")
    if not user_in.password:
        raise HTTPException(status_code=400, detail="Password is required")
    if user_in.password != confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match")
    if len(user_in.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    if plan_value not in {"basic", "freemium", "premium"}:
        raise HTTPException(status_code=400, detail="Invalid plan selected")

    if email:
        existing = await db.execute(text("SELECT id FROM users WHERE email = :email"), {"email": email})
        if existing.first():
            raise HTTPException(status_code=400, detail="Email is already registered.")
    if phone:
        existing = await db.execute(text("SELECT id FROM users WHERE phone = :phone"), {"phone": phone})
        if existing.first():
            raise HTTPException(status_code=400, detail="Phone number is already registered.")
    if username:
        existing = await db.execute(text("SELECT id FROM users WHERE username = :username"), {"username": username})
        if existing.first():
            raise HTTPException(status_code=400, detail="Username is already taken.")

    hashed = auth.get_password_hash(user_in.password)
    await db.execute(
        text(
            "INSERT INTO users (email, phone, username, company_name, password_hash, full_name, role, plan, owner_id, is_active) "
            "VALUES (:email, :phone, :username, :company_name, :password_hash, :full_name, 'user', :plan, NULL, TRUE)"
        ),
        {
            "email": email,
            "phone": phone,
            "username": username,
            "company_name": company_name,
            "password_hash": hashed,
            "full_name": full_name,
            "plan": plan_value,
        },
    )
    await db.commit()

    result = await db.execute(
        text(
            "SELECT id, email, phone, username, company_name, full_name, role, plan, owner_id, is_active, created_at FROM users "
            "WHERE (email = :email AND :email IS NOT NULL) OR (phone = :phone AND :phone IS NOT NULL) OR (username = :username AND :username IS NOT NULL) LIMIT 1"
        ),
        {"email": email, "phone": phone, "username": username},
    )
    row = result.first()
    if not row:
        raise HTTPException(status_code=500, detail="User created but could not be loaded")
    return dict(row._mapping)


@app.post("/auth/token", response_model=schemas.Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
    # form_data.username is email, phone, or username
    result = await db.execute(
        text("SELECT id, email, phone, username, password_hash FROM users WHERE email = :username OR phone = :username OR username = :username"),
        {"username": form_data.username},
    )
    user_row = result.first()
    if not user_row:
        raise HTTPException(status_code=400, detail="Incorrect username or password")
    user = user_row._mapping
    if not auth.verify_password(form_data.password, user["password_hash"]):
        raise HTTPException(status_code=400, detail="Incorrect username or password")
    access_token_expires = timedelta(minutes=int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60")))
    token = auth.create_access_token(data={"sub": str(user["id"])}, expires_delta=access_token_expires)
    return {"access_token": token, "token_type": "bearer"}


@app.get("/users/me", response_model=schemas.UserOut)
async def read_users_me(current=Depends(auth.get_current_user)):
    return current


@app.post("/users/me/plan", response_model=schemas.UserOut)
async def update_users_plan(payload: dict = Body(...), db: AsyncSession = Depends(get_db), current=Depends(auth.get_current_user)):
    allowed_plans = {"basic", "freemium", "premium"}
    plan_value = normalize_plan_name(payload.get("plan", "basic"))
    if plan_value not in allowed_plans:
        raise HTTPException(status_code=400, detail="Invalid plan selected.")

    await db.execute(
        text("UPDATE users SET plan = :plan WHERE id = :user_id"),
        {"plan": plan_value, "user_id": current["id"]},
    )
    await db.commit()
    result = await db.execute(
        text("SELECT id, email, phone, username, company_name, full_name, role, plan, owner_id, is_active, created_at FROM users WHERE id = :id"),
        {"id": current["id"]},
    )
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="User not found")
    return dict(row._mapping)


@app.get("/users/staff")
async def list_staff_accounts(db: AsyncSession = Depends(get_db), current=Depends(auth.get_current_user)):
    require_min_plan(current, "premium")
    if current.get("role") == "staff":
        raise HTTPException(status_code=403, detail="Staff accounts cannot manage staff")

    result = await db.execute(
        text(
            "SELECT id, email, phone, username, company_name, full_name, role, plan, is_active, created_at FROM users "
            "WHERE owner_id = :owner_id ORDER BY created_at DESC"
        ),
        {"owner_id": current["id"]},
    )
    rows = result.fetchall()
    staff_accounts = []
    for row in rows:
        staff_id, email, phone, username, company_name, full_name, role, plan, is_active, created_at = row
        staff_accounts.append({
            "id": staff_id,
            "email": email,
            "phone": phone,
            "username": username,
            "company_name": company_name,
            "full_name": full_name,
            "role": role,
            "plan": plan,
            "is_active": is_active,
            "created_at": created_at.isoformat() if created_at else None,
        })
    return {"staff": staff_accounts}


@app.post("/users/staff")
async def create_staff_account(payload: dict = Body(...), db: AsyncSession = Depends(get_db), current=Depends(auth.get_current_user)):
    require_min_plan(current, "premium")
    if current.get("role") == "staff":
        raise HTTPException(status_code=403, detail="Staff accounts cannot create staff")

    email = str(payload.get("email") or "").strip().lower() if payload.get("email") else None
    phone = str(payload.get("phone") or "").strip() if payload.get("phone") else None
    username = str(payload.get("username") or "").strip().lower() if payload.get("username") else None
    full_name = str(payload.get("full_name") or "").strip() if payload.get("full_name") else None
    password = str(payload.get("password") or "")
    if not (email or phone):
        raise HTTPException(status_code=400, detail="email or phone required")
    if not full_name:
        raise HTTPException(status_code=400, detail="Staff full name is required")
    if not username:
        raise HTTPException(status_code=400, detail="Username is required")
    if len(password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    if email:
        existing = await db.execute(text("SELECT id FROM users WHERE email = :email"), {"email": email})
        if existing.first():
            raise HTTPException(status_code=400, detail="Email is already registered.")
    if phone:
        existing = await db.execute(text("SELECT id FROM users WHERE phone = :phone"), {"phone": phone})
        if existing.first():
            raise HTTPException(status_code=400, detail="Phone number is already registered.")
    if username:
        existing = await db.execute(text("SELECT id FROM users WHERE username = :username"), {"username": username})
        if existing.first():
            raise HTTPException(status_code=400, detail="Username is already taken.")

    hashed = auth.get_password_hash(password)
    await db.execute(
        text(
            "INSERT INTO users (email, phone, username, company_name, owner_id, password_hash, full_name, role, plan, is_active) "
            "VALUES (:email, :phone, :username, :company_name, :owner_id, :password_hash, :full_name, 'staff', 'basic', TRUE)"
        ),
        {
            "email": email,
            "phone": phone,
            "username": username,
            "company_name": current.get("company_name") or current.get("full_name") or "Business staff",
            "owner_id": current["id"],
            "password_hash": hashed,
            "full_name": full_name,
        },
    )
    await db.commit()
    return {"ok": True, "message": "Staff account created successfully"}


@app.post("/users/staff/{staff_id}/toggle-active")
async def toggle_staff_account_active(staff_id: int, db: AsyncSession = Depends(get_db), current=Depends(auth.get_current_user)):
    require_min_plan(current, "premium")
    if current.get("role") == "staff":
        raise HTTPException(status_code=403, detail="Staff accounts cannot manage staff")

    result = await db.execute(
        text("SELECT id, is_active FROM users WHERE id = :staff_id AND owner_id = :owner_id AND role = 'staff'"),
        {"staff_id": staff_id, "owner_id": current["id"]},
    )
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Staff account not found")

    new_active = not bool(row[1])
    await db.execute(
        text("UPDATE users SET is_active = :is_active WHERE id = :staff_id"),
        {"is_active": new_active, "staff_id": staff_id},
    )
    await db.commit()
    return {"ok": True, "is_active": new_active}


# ==================== FOUNDER / ADMIN ENDPOINTS ====================

@app.post("/founder/login", response_model=schemas.Token)
async def founder_login(form_data: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
    """Founder login - validates founder role"""
    result = await db.execute(
        text("SELECT id, email, phone, password_hash, role FROM users WHERE (email = :username OR phone = :username) AND role = 'founder'"),
        {"username": form_data.username},
    )
    user_row = result.first()
    if not user_row:
        raise HTTPException(status_code=400, detail="Founder credentials invalid")
    user = user_row._mapping
    if not auth.verify_password(form_data.password, user["password_hash"]):
        raise HTTPException(status_code=400, detail="Founder credentials invalid")
    access_token_expires = timedelta(minutes=int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "120")))
    token = auth.create_access_token(data={"sub": str(user["id"])}, expires_delta=access_token_expires)
    return {"access_token": token, "token_type": "bearer"}


@app.get("/founder/users")
async def list_all_users(db: AsyncSession = Depends(get_db), founder=Depends(auth.get_founder_user)):
    """List all users in the system with their profile and subscription info"""
    result = await db.execute(
        text(
            "SELECT id, email, phone, full_name, role, plan, is_active, created_at "
            "FROM users WHERE role = 'user' ORDER BY created_at DESC"
        )
    )
    rows = result.fetchall()
    users = []
    for row in rows:
        user_id, email, phone, full_name, role, plan, is_active, created_at = row
        
        # Get user's sales count and total revenue
        sales_result = await db.execute(
            text("SELECT COUNT(*) as cnt, SUM(amount_cents) as total FROM sales WHERE recorded_by = :user_id"),
            {"user_id": user_id}
        )
        sales_row = sales_result.first()
        sales_count = sales_row[0] or 0
        total_revenue = float(sales_row[1] or 0) / 100 if sales_row[1] else 0
        
        users.append({
            "id": user_id,
            "email": email,
            "phone": phone,
            "full_name": full_name or "Unnamed User",
            "role": role,
            "plan": plan,
            "is_active": is_active,
            "created_at": created_at.isoformat() if created_at else None,
            "sales_count": sales_count,
            "total_revenue_tzs": total_revenue,
        })
    return {"users": users, "total_count": len(users)}


@app.get("/founder/users/{user_id}")
async def get_user_details(user_id: int, db: AsyncSession = Depends(get_db), founder=Depends(auth.get_founder_user)):
    """Get detailed information about a specific user"""
    result = await db.execute(
        text(
            "SELECT id, email, phone, full_name, role, plan, is_active, created_at "
            "FROM users WHERE id = :user_id AND role = 'user'"
        ),
        {"user_id": user_id}
    )
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="User not found")
    
    user_id, email, phone, full_name, role, plan, is_active, created_at = row
    
    # Get sales details
    sales_result = await db.execute(
        text(
            "SELECT COUNT(*) as cnt, SUM(amount_cents) as total, MIN(recorded_at) as first_sale, MAX(recorded_at) as last_sale "
            "FROM sales WHERE recorded_by = :user_id"
        ),
        {"user_id": user_id}
    )
    sales_row = sales_result.first()
    sales_count = sales_row[0] or 0
    total_revenue = float(sales_row[1] or 0) / 100 if sales_row[1] else 0
    first_sale = sales_row[2].isoformat() if sales_row[2] else None
    last_sale = sales_row[3].isoformat() if sales_row[3] else None
    
    # Get inventory count
    inventory_result = await db.execute(
        text("SELECT COUNT(*) as cnt FROM inventory_items WHERE recorded_by = :user_id"),
        {"user_id": user_id}
    )
    inventory_row = inventory_result.first()
    inventory_count = inventory_row[0] if inventory_row else 0
    
    # Get KPI count
    kpi_result = await db.execute(
        text("SELECT COUNT(*) as cnt FROM kpi_values WHERE recorded_by = :user_id"),
        {"user_id": user_id}
    )
    kpi_row = kpi_result.first()
    kpi_count = kpi_row[0] if kpi_row else 0
    
    return {
        "id": user_id,
        "email": email,
        "phone": phone,
        "full_name": full_name or "Unnamed User",
        "role": role,
        "plan": plan,
        "is_active": is_active,
        "created_at": created_at.isoformat() if created_at else None,
        "sales": {
            "count": sales_count,
            "total_revenue_tzs": total_revenue,
            "first_sale": first_sale,
            "last_sale": last_sale,
        },
        "inventory_items": inventory_count,
        "kpi_entries": kpi_count,
    }


@app.post("/founder/users/{user_id}/plan")
async def founder_update_user_plan(user_id: int, payload: dict = Body(...), db: AsyncSession = Depends(get_db), founder=Depends(auth.get_founder_user)):
    """Founder updates a user's subscription plan"""
    allowed_plans = {"basic", "freemium", "premium"}
    plan_value = normalize_plan_name(payload.get("plan", "freemium"))
    if plan_value not in allowed_plans:
        raise HTTPException(status_code=400, detail="Invalid plan selected.")
    
    # Check if user exists and is not a founder
    result = await db.execute(
        text("SELECT id, role FROM users WHERE id = :user_id"),
        {"user_id": user_id}
    )
    user_row = result.first()
    if not user_row or user_row[1] != "user":
        raise HTTPException(status_code=404, detail="User not found or cannot modify this user")
    
    await db.execute(
        text("UPDATE users SET plan = :plan WHERE id = :user_id"),
        {"plan": plan_value, "user_id": user_id},
    )
    await db.commit()
    
    result = await db.execute(
        text("SELECT id, email, phone, full_name, role, plan, is_active, created_at FROM users WHERE id = :id"),
        {"id": user_id},
    )
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="User not found")
    return dict(row._mapping)


@app.post("/founder/users/{user_id}/toggle-active")
async def founder_toggle_user_active(user_id: int, db: AsyncSession = Depends(get_db), founder=Depends(auth.get_founder_user)):
    """Founder toggles a user's active status"""
    # Check if user exists
    result = await db.execute(
        text("SELECT id, is_active FROM users WHERE id = :user_id AND role = 'user'"),
        {"user_id": user_id}
    )
    user_row = result.first()
    if not user_row:
        raise HTTPException(status_code=404, detail="User not found")
    
    current_active = user_row[1]
    new_active = not current_active
    
    await db.execute(
        text("UPDATE users SET is_active = :is_active WHERE id = :user_id"),
        {"is_active": new_active, "user_id": user_id},
    )
    await db.commit()
    
    return {"success": True, "user_id": user_id, "is_active": new_active}


@app.get("/founder/analytics")
async def founder_get_analytics(db: AsyncSession = Depends(get_db), founder=Depends(auth.get_founder_user)):
    """Get system-wide analytics"""
    # Total users
    users_result = await db.execute(text("SELECT COUNT(*) as cnt FROM users WHERE role = 'user'"))
    users_row = users_result.first()
    total_users = users_row[0] if users_row else 0
    
    # Premium users
    premium_result = await db.execute(text("SELECT COUNT(*) as cnt FROM users WHERE role = 'user' AND plan = 'premium'"))
    premium_row = premium_result.first()
    premium_users = premium_row[0] if premium_row else 0
    
    # Total sales
    sales_result = await db.execute(text("SELECT COUNT(*) as cnt, SUM(amount_cents) as total FROM sales"))
    sales_row = sales_result.first()
    total_sales_count = sales_row[0] or 0
    total_sales_revenue = float(sales_row[1] or 0) / 100 if sales_row[1] else 0
    
    # Total inventory items
    inventory_result = await db.execute(text("SELECT COUNT(*) as cnt FROM inventory_items"))
    inventory_row = inventory_result.first()
    total_inventory_items = inventory_row[0] if inventory_row else 0
    
    # Average revenue per user (premium vs freemium)
    revenue_by_plan = await db.execute(
        text(
            "SELECT u.plan, COUNT(s.id) as sales_count, SUM(s.amount_cents) as total_cents "
            "FROM users u LEFT JOIN sales s ON u.id = s.recorded_by "
            "WHERE u.role = 'user' GROUP BY u.plan"
        )
    )
    revenue_by_plan_rows = revenue_by_plan.fetchall()
    plan_stats = {}
    for row in revenue_by_plan_rows:
        plan, sales_count, total_cents = row
        plan_stats[plan or "freemium"] = {
            "sales_count": sales_count or 0,
            "total_revenue_tzs": float(total_cents or 0) / 100,
        }
    
    return {
        "total_users": total_users,
        "premium_users": premium_users,
        "freemium_users": total_users - premium_users,
        "total_sales": {
            "count": total_sales_count,
            "revenue_tzs": total_sales_revenue,
        },
        "total_inventory_items": total_inventory_items,
        "revenue_by_plan": plan_stats,
    }
