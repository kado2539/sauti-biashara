-- PostgreSQL schema for Sauti Biashara
-- Tracks users, organizations, KPIs, sales, subscriptions, and WhatsApp links

-- Users
CREATE TABLE IF NOT EXISTS users (
	id SERIAL PRIMARY KEY,
	email TEXT UNIQUE,
	phone TEXT UNIQUE,
	password_hash TEXT,
	full_name TEXT,
	role TEXT NOT NULL DEFAULT 'user',
	plan TEXT NOT NULL DEFAULT 'freemium',
	is_active BOOLEAN DEFAULT TRUE,
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Organizations / businesses
CREATE TABLE IF NOT EXISTS organizations (
	id SERIAL PRIMARY KEY,
	name TEXT NOT NULL,
	slug TEXT UNIQUE NOT NULL,
	owner_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Memberships (users belong to orgs)
CREATE TABLE IF NOT EXISTS org_members (
	org_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
	user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
	role TEXT DEFAULT 'member',
	PRIMARY KEY (org_id, user_id)
);

-- Subscription plans
CREATE TABLE IF NOT EXISTS plans (
	id SERIAL PRIMARY KEY,
	name TEXT NOT NULL,
	price_cents INTEGER NOT NULL DEFAULT 0,
	interval TEXT NOT NULL DEFAULT 'monthly', -- monthly, yearly, one-time
	features JSONB DEFAULT '{}'::jsonb,
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Subscriptions for organizations
CREATE TABLE IF NOT EXISTS subscriptions (
	id SERIAL PRIMARY KEY,
	org_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
	plan_id INTEGER REFERENCES plans(id) ON DELETE SET NULL,
	status TEXT NOT NULL DEFAULT 'active', -- active, cancelled, trialing
	started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
	ends_at TIMESTAMP WITH TIME ZONE
);

-- KPI definitions per organization
CREATE TABLE IF NOT EXISTS kpis (
	id SERIAL PRIMARY KEY,
	org_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
	key TEXT NOT NULL,
	name TEXT NOT NULL,
	description TEXT,
	unit TEXT,
	aggregation TEXT DEFAULT 'sum', -- sum, avg, count
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
	UNIQUE (org_id, key)
);

-- KPI recorded values (time series)
CREATE TABLE IF NOT EXISTS kpi_values (
	id SERIAL PRIMARY KEY,
	kpi_id INTEGER REFERENCES kpis(id) ON DELETE CASCADE,
	recorded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
	recorded_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
	value NUMERIC NOT NULL,
	notes TEXT
);

-- Sales/transactions entries
CREATE TABLE IF NOT EXISTS sales (
	id SERIAL PRIMARY KEY,
	org_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
	recorded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
	amount_cents INTEGER NOT NULL,
	currency TEXT DEFAULT 'KES',
	recorded_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
	notes TEXT
);

-- Payments / billing records
CREATE TABLE IF NOT EXISTS payments (
	id SERIAL PRIMARY KEY,
	org_id INTEGER REFERENCES organizations(id) ON DELETE SET NULL,
	amount_cents INTEGER NOT NULL,
	provider TEXT,
	provider_payment_id TEXT,
	status TEXT DEFAULT 'pending',
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
	meta JSONB DEFAULT '{}'::jsonb
);

-- WhatsApp account links (for bot integration)
CREATE TABLE IF NOT EXISTS whatsapp_accounts (
	id SERIAL PRIMARY KEY,
	org_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
	phone_number TEXT NOT NULL,
	provider TEXT NOT NULL, -- 'whatsapp_cloud' or 'twilio'
	provider_meta JSONB DEFAULT '{}'::jsonb,
	linked_user INTEGER REFERENCES users(id) ON DELETE SET NULL,
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
	UNIQUE (provider, phone_number)
);

-- Incoming/outgoing bot messages for audit + replay
CREATE TABLE IF NOT EXISTS bot_messages (
	id SERIAL PRIMARY KEY,
	whatsapp_account_id INTEGER REFERENCES whatsapp_accounts(id) ON DELETE CASCADE,
	direction TEXT NOT NULL, -- 'in' or 'out'
	payload JSONB,
	status TEXT DEFAULT 'received',
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Audit logs
CREATE TABLE IF NOT EXISTS audit_logs (
	id SERIAL PRIMARY KEY,
	org_id INTEGER REFERENCES organizations(id) ON DELETE SET NULL,
	user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
	action TEXT NOT NULL,
	meta JSONB DEFAULT '{}'::jsonb,
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_kpi_values_kpi_id ON kpi_values(kpi_id);
CREATE INDEX IF NOT EXISTS idx_sales_org_id ON sales(org_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_accounts_org_id ON whatsapp_accounts(org_id);

-- End of schema

