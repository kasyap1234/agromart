
DO $$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
            CREATE TYPE user_role AS ENUM ('user', 'supervisor', 'manager', 'super_admin');
        END IF;
    END
$$;

-- Then define the users table
CREATE TABLE IF NOT EXISTS users (
                                     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                                     name TEXT NOT NULL,
                                     email TEXT UNIQUE NOT NULL,
                                     password TEXT NOT NULL,
                                     phone TEXT NOT NULL,
                                    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
                                     role user_role NOT NULL DEFAULT 'user',
                                     created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
