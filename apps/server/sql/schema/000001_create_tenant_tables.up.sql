CREATE TABLE IF NOT EXISTS tenants(
    id UUID PRIMARY KEY DEFAULT  pg_catalog.gen_random_uuid(),
    name TEXT NOT NULL,
      email TEXT NOT NULL,
    phone TEXT NOT NULL,
    address TEXT ,
    registration_number TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                                 );