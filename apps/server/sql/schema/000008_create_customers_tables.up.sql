CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name TEXT NOT NULL,
    contact_person TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    payment_mode TEXT ,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id,name)

);

CREATE INDEX IF NOT EXISTS idx_customers_tenant_id  on customers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customers_name  on customers(name);
CREATE INDEX IF NOT EXISTS idx_customers_email  on customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_phone on customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_tenant_active on customers(tenant_id,is_active);
CREATE INDEX IF NOT EXISTS idx_customers_active on customers(is_active);
