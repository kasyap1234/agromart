
CREATE TABLE inventory_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    batch_id UUID NOT NULL REFERENCES batches(id),
    transaction_type TEXT NOT NULL, -- e.g., 'purchase', 'sale', 'return', 'adjustment'
    quantity_change NUMERIC(10, 2) NOT NULL,
    transaction_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes TEXT,
    reference_id UUID -- e.g., purchase_order_id, sales_order_id
);
