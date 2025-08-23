-- Drop trigger first
DROP TRIGGER IF EXISTS update_files_updated_at ON files;

-- Drop function
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Remove added columns from existing tables
ALTER TABLE users DROP COLUMN IF EXISTS avatar_url;
ALTER TABLE suppliers DROP COLUMN IF EXISTS logo_url;
-- Note: products.image_url is kept as it was already existing

-- Drop indexes
DROP INDEX IF EXISTS idx_files_tenant_id;
DROP INDEX IF EXISTS idx_files_entity_type_entity_id;
DROP INDEX IF EXISTS idx_files_file_type;
DROP INDEX IF EXISTS idx_files_mime_type;
DROP INDEX IF EXISTS idx_files_uploaded_by;
DROP INDEX IF EXISTS idx_files_expires_at;
DROP INDEX IF EXISTS idx_files_virus_scan_status;
DROP INDEX IF EXISTS idx_files_created_at;

-- Drop files table
DROP TABLE IF EXISTS files;