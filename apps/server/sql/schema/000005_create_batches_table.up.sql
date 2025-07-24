CREATE TABLE IF NOT EXISTS batches(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    batch_number TEXT NOT NULL,
    expiry_date DATE,
    cost NUMERIC(12,2), -- Standardized precision to match products table
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Removed unit_id since batches inherit unit from products
    UNIQUE(tenant_id, product_id, batch_number)
);

-- Performance indexes
CREATE INDEX idx_batches_tenant_id ON batches(tenant_id);
CREATE INDEX idx_batches_product_id ON batches(product_id);
CREATE INDEX idx_batches_batch_number ON batches(batch_number);
CREATE INDEX idx_batches_expiry_date ON batches(expiry_date) WHERE expiry_date IS NOT NULL;
CREATE INDEX idx_batches_tenant_product ON batches(tenant_id, product_id);