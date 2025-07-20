CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE category IF NOT EXISTS (
    id UUID PRIMARY KEY     gen_random_uuid(),
    name TEXT NOT NULL,
)

