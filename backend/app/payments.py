import os
import stripe
from fastapi import APIRouter, Request, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Depends
from .database import get_db
from sqlalchemy import text

router = APIRouter(prefix="/payments")

stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "")
WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")


@router.post("/create-checkout-session")
async def create_checkout_session(payload: dict, db: AsyncSession = Depends(get_db)):
    # payload: {org_id, plan_name, amount_cents, currency}
    try:
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[{"price_data": {"currency": payload.get("currency", "kes").lower(),
                                         "product_data": {"name": payload.get("plan_name", "subscription")},
                                         "unit_amount": payload.get("amount_cents", 0)},
                           "quantity": 1}],
            mode="payment",
            success_url=payload.get("success_url", "https://example.com/success"),
            cancel_url=payload.get("cancel_url", "https://example.com/cancel"),
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    # record payment stub
    await db.execute(
        text("INSERT INTO payments (org_id, amount_cents, provider, provider_payment_id, status, meta) VALUES (:org_id, :amount_cents, 'stripe', :pid, 'created', :meta)"),
        {"org_id": payload.get("org_id"), "amount_cents": payload.get("amount_cents"), "pid": session.id, "meta": {}}
    )
    await db.commit()
    return {"checkout_url": session.url, "id": session.id}


@router.post("/webhook")
async def stripe_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    event = None
    try:
        event = stripe.Webhook.construct_event(payload, sig_header, WEBHOOK_SECRET) if WEBHOOK_SECRET else stripe.Event.construct_from(request.json(), stripe.api_key)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Webhook error: {e}")

    # Handle payment succeeded
    if event and event.get("type") == "checkout.session.completed":
        session = event["data"]["object"]
        # update payment record
        await db.execute(text("UPDATE payments SET status='paid' WHERE provider_payment_id = :pid"), {"pid": session.get("id")})
        await db.commit()

    return {"received": True}
