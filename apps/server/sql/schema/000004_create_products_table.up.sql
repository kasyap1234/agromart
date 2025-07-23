CREATE TABLE IF NOT EXISTS products(
    id SERIAL PRIMARY KEY,
    sku UUID NOT NULL,
    name text NOT NULL,
    price numeric NOT NULL,
    description text,
    image_url text,
   brand TEXT,
    unit_id UUID NOT NULL REFERENCES units(id),
    price_per_unit NUMERIC(10,2),
    gst_percent NUMERIC(5,2)
);