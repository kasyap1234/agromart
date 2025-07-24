CREATE TABLE IF NOT EXISTS products(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- Fixed: UUID instead of SERIAL
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE, -- Added: Multi-tenant
    sku TEXT NOT NULL,
    name TEXT NOT NULL,
    price NUMERIC(12,2) NOT NULL,
    description TEXT,
    image_url TEXT,
    brand TEXT,
    unit_id UUID NOT NULL REFERENCES units(id),
    price_per_unit NUMERIC(10,2),
    gst_percent NUMERIC(5,2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, sku) -- Ensure SKU unique per tenant
);
CREATE INDEX IF NOT EXISTS idx_products_tenant_id ON products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_unit_id ON products(unit_id);
CREATE INDEX IF NOT EXISTS idx_products_tenant_sku ON products(tenant_id, sku);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS Idx_products_brand ON products(brand) WHERE brand IS NOT NULL;