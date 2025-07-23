CREATE TABLE IF NOT EXISTS batches(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id  UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
--     Only one type of product per batch
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    batch_number TEXT NOT NULL,
    expiry_date DATE,
    cost NUMERIC(10,2),
    unit_id UUID NOT NULL REFERENCES units(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
-- SAME BATCH NO SHOULD NOT APPEAR FOR MULTIPLE PRODUCTS BUT MULTIPLE PRODUCTS CAN HAVE THE SAME BATCH NUMBER
    UNIQUE(tenant_id, product_id, batch_number)
)