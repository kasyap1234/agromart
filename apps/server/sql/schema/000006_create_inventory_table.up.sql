CREATE TABLE IF NOT EXISTS inventory(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    quantity NUMERIC(10,2) NOT NULL CHECK (quantity > 0),
    reserved_quantity NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (reserved_quantity >= 0),
    available_quantity NUMERIC(10,2) GENERATED ALWAYS AS (quantity - reserved_quantity) STORED,
    min_stock_level NUMERIC(10,2) DEFAULT 0,
    max_stock_level NUMERIC(10,2),
    last_counted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, product_id, batch_id, location_id)
);