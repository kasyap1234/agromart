-- Create files table for storing file metadata
CREATE TABLE IF NOT EXISTS files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    original_name TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type TEXT NOT NULL,
    file_type TEXT NOT NULL CHECK (file_type IN ('image', 'document', 'avatar', 'logo')),
    entity_type TEXT NOT NULL CHECK (entity_type IN ('user', 'product', 'supplier', 'customer')),
    entity_id UUID NOT NULL,
    width INTEGER,
    height INTEGER,
    compression_applied BOOLEAN DEFAULT FALSE,
    virus_scanned BOOLEAN DEFAULT FALSE,
    virus_scan_status TEXT CHECK (virus_scan_status IN ('clean', 'infected', 'pending', 'error')),
    checksum TEXT,
    bucket_name TEXT NOT NULL,
    object_key TEXT NOT NULL,
    is_public BOOLEAN DEFAULT FALSE,
    uploaded_by UUID REFERENCES users(id),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_files_tenant_id ON files(tenant_id);
CREATE INDEX IF NOT EXISTS idx_files_entity_type_entity_id ON files(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_files_file_type ON files(file_type);
CREATE INDEX IF NOT EXISTS idx_files_mime_type ON files(mime_type);
CREATE INDEX IF NOT EXISTS idx_files_uploaded_by ON files(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_files_expires_at ON files(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_files_virus_scan_status ON files(virus_scan_status);
CREATE INDEX IF NOT EXISTS idx_files_created_at ON files(created_at DESC);

-- Add avatar_url and logo_url columns to existing tables
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT; -- Already exists, but ensuring it
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_files_updated_at BEFORE UPDATE ON files
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();