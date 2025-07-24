CREATE TABLE IF NOT EXISTS suppliers(
    id UUID  PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name TEXT NOT NULL,
    contact_person TEXT ,
    email TEXT,
    phone TEXT,
    address TEXT,
    tax_id TEXT,
    payment_mode TEXT ,
    is_active BOOLEAN,
    unique(tenant_id,name)
);

CREATE INDEX IF NOT EXISTS idx_suppliers_tenant_id ON suppliers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);
CREATE INDEX IF NOT EXISTS idx_suppliers_email ON suppliers(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_suppliers_is_active ON suppliers(is_active);
CREATE INDEX IF NOT EXISTS idx_suppliers_tenant_active ON suppliers(tenant_id, is_active);
