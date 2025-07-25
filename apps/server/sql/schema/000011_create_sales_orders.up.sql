
CREATE TABLE IF NOT EXISTS sales_orders(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    so_number TEXT NOT NULL,
    customer_id UUID NOT NULL REFERENCES customers(id),
    location_id UUID REFERENCES locations(id), -- Delivery location
    order_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expected_delivery_date DATE,
    actual_delivery_date DATE,
    total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    tax_amount NUMERIC(12,2) DEFAULT 0,
    discount_amount NUMERIC(12,2) DEFAULT 0,
    final_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'PENDING', -- PENDING, APPROVED, SHIPPED, DELIVERED, CANCELLED
    notes TEXT,
    created_by UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, so_number)
);

CREATE TABLE IF NOT EXISTS sales_order_items(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    sales_order_id UUID NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    batch_id UUID REFERENCES batches(id), -- Can be null initially, filled when shipped
    quantity_ordered NUMERIC(10,3) NOT NULL,
    quantity_shipped NUMERIC(10,3) DEFAULT 0,
    unit_price NUMERIC(12,2) NOT NULL,
    total_price NUMERIC(12,2) NOT NULL,
    tax_percent NUMERIC(5,2) DEFAULT 0,
    discount_percent NUMERIC(5,2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sales_orders_tenant_id ON sales_orders (tenant_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_so_number ON sales_orders (so_number);
CREATE INDEX IF NOT EXISTS idx_sales_orders_customer_id ON sales_orders (customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_location_id ON sales_orders (location_id) WHERE location_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sales_orders_status ON sales_orders (status);
CREATE INDEX IF NOT EXISTS idx_sales_orders_order_date ON sales_orders (order_date);
CREATE INDEX IF NOT EXISTS idx_sales_orders_tenant_status ON sales_orders (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_sales_orders_tenant_date ON sales_orders (tenant_id, order_date);

CREATE INDEX IF NOT EXISTS idx_so_items_tenant_id ON sales_order_items (tenant_id);
CREATE INDEX IF NOT EXISTS idx_so_items_sales_order_id ON sales_order_items (sales_order_id);
CREATE INDEX IF NOT EXISTS idx_so_items_product_id ON sales_order_items (product_id);
CREATE INDEX IF NOT EXISTS idx_so_items_batch_id ON sales_order_items (batch_id) WHERE batch_id IS NOT NULL;
