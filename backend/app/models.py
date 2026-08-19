from sqlalchemy import Column, Integer, String, Boolean, Text, DateTime, func, ForeignKey, Numeric
from .database import Base


class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=True)
    phone = Column(String(50), unique=True, index=True, nullable=True)
    username = Column(String(120), unique=True, index=True, nullable=True)
    company_name = Column(String(255), nullable=True)
    owner_id = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'), nullable=True, index=True)
    password_hash = Column(Text)
    full_name = Column(String(255), nullable=True)
    role = Column(String(50), nullable=False, default="user")
    plan = Column(String(50), nullable=False, default="freemium")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class KPI(Base):
    __tablename__ = 'kpis'
    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(100), nullable=False, unique=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    unit = Column(String(50), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class KPIValue(Base):
    __tablename__ = 'kpi_values'
    id = Column(Integer, primary_key=True, index=True)
    kpi_id = Column(Integer, ForeignKey('kpis.id', ondelete='CASCADE'))
    recorded_by = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'))
    recorded_at = Column(DateTime(timezone=True), server_default=func.now())
    value = Column(Numeric(18, 4), nullable=False)
    notes = Column(Text, nullable=True)


class Sale(Base):
    __tablename__ = 'sales'
    id = Column(Integer, primary_key=True, index=True)
    recorded_by = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'))
    amount_cents = Column(Integer, nullable=False)
    currency = Column(String(10), default='TZS')
    recorded_at = Column(DateTime(timezone=True), server_default=func.now())
    notes = Column(Text, nullable=True)


class InventoryItem(Base):
    __tablename__ = 'inventory_items'
    id = Column(Integer, primary_key=True, index=True)
    recorded_by = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'))
    sku = Column(String(100), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    category = Column(String(120), nullable=True)
    cost_price = Column(Numeric(18, 4), nullable=False, default=0)
    selling_price = Column(Numeric(18, 4), nullable=False, default=0)
    stock_quantity = Column(Integer, nullable=False, default=0)
    reorder_level = Column(Integer, nullable=False, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class InventoryMovement(Base):
    __tablename__ = 'inventory_movements'
    id = Column(Integer, primary_key=True, index=True)
    item_id = Column(Integer, ForeignKey('inventory_items.id', ondelete='CASCADE'))
    recorded_by = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'))
    movement_type = Column(String(50), nullable=False)
    quantity_change = Column(Integer, nullable=False)
    notes = Column(Text, nullable=True)
    recorded_at = Column(DateTime(timezone=True), server_default=func.now())
