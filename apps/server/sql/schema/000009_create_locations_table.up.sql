CREATE TABLE IF NOT EXISTS locations(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    address TEXT,
    city TEXT,
    state TEXT,
    postal_code TEXT,
    country TEXT,
    phone TEXT,
    email TEXT,
    location_type TEXT NOT NULL DEFAULT 'WAREHOUSE', -- WAREHOUSE, STORE, OFFICE, DISTRIBUTION_CENTER
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, name)
);

-- Performance indexes for locations
CREATE INDEX IF NOT EXISTS idx_locations_tenant_id ON locations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_locations_name ON locations(name);
CREATE INDEX IF NOT EXISTS idx_locations_location_type ON locations(location_type);
CREATE INDEX IF NOT EXISTS idx_locations_tenant_name ON locations(tenant_id, name);
CREATE INDEX IF NOT EXISTS idx_locations_city ON locations(city) WHERE city IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_locations_is_active ON locations(is_active);