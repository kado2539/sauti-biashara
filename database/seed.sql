-- Seed data for local development

-- Plans
INSERT INTO plans (name, price_cents, interval, features) VALUES
('Free', 0, 'monthly', '{"kpi_limit": 10, "whatsapp": false}'),
('Pro', 5000, 'monthly', '{"kpi_limit": 100, "whatsapp": true, "priority_support": true}');

-- Admin user (dev only) -- password placeholder: 'devpass'
INSERT INTO users (email, phone, password_hash, full_name)
VALUES ('admin@example.com', '+254700000000', 'dev:devpass', 'Admin User')
RETURNING id INTO TEMPORARY TABLE temp_admin_id;

-- Create an organization and membership
INSERT INTO organizations (name, slug, owner_id)
SELECT 'Acme Trading', 'acme-trading', id FROM temp_admin_id RETURNING id INTO TEMPORARY TABLE temp_org_id;

INSERT INTO org_members (org_id, user_id, role)
SELECT id, (SELECT id FROM temp_admin_id), 'owner' FROM temp_org_id;

-- Sample KPIs
INSERT INTO kpis (org_id, key, name, description, unit, aggregation)
SELECT id, 'monthly_revenue', 'Monthly Revenue', 'Total revenue for the month', 'KES', 'sum' FROM temp_org_id;

INSERT INTO kpis (org_id, key, name, description, unit, aggregation)
SELECT id, 'daily_sales_count', 'Daily Sales Count', 'Number of sales recorded each day', 'count', 'count' FROM temp_org_id;

-- Insert some KPI sample values
INSERT INTO kpi_values (kpi_id, recorded_by, recorded_at, value, notes)
VALUES
((SELECT k.id FROM kpis k JOIN organizations o ON k.org_id=o.id WHERE o.slug='acme-trading' AND k.key='monthly_revenue'),
 (SELECT id FROM temp_admin_id), now() - interval '7 days', 125000.00, 'Week 1 revenue'),
((SELECT k.id FROM kpis k JOIN organizations o ON k.org_id=o.id WHERE o.slug='acme-trading' AND k.key='monthly_revenue'),
 (SELECT id FROM temp_admin_id), now() - interval '1 days', 45000.00, 'Yesterday revenue');

-- Sample sales
INSERT INTO sales (org_id, recorded_by, amount_cents, currency, recorded_at, notes)
SELECT id, (SELECT id FROM temp_admin_id), 12500000, 'KES', now() - interval '7 days', 'Sale batch 1' FROM temp_org_id;

-- Link a WhatsApp account entry (not active with provider credentials)
INSERT INTO whatsapp_accounts (org_id, phone_number, provider, provider_meta, linked_user)
SELECT id, '+254711000000', 'whatsapp_cloud', '{"status": "placeholder"}', (SELECT id FROM temp_admin_id) FROM temp_org_id;

-- Cleanup temporary tables if they exist
DROP TABLE IF EXISTS temp_admin_id;
DROP TABLE IF EXISTS temp_org_id;
