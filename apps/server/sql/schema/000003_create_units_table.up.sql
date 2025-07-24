CREATE TABLE IF NOT EXISTS units(
                                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                                    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
                                    name TEXT NOT NULL,
                                    abbreviation TEXT NOT NULL,
                                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                                    UNIQUE(tenant_id, name)
);

CREATE INDEX idx_units_tenant_id ON units(tenant_id);
CREATE INDEX idx_units_name ON units(name);
CREATE INDEX idx_units_abbreviation ON units(abbreviation);
