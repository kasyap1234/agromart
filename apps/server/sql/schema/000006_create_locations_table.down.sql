-- Drop indexes first
DROP INDEX IF EXISTS idx_locations_tenant_id;
DROP INDEX IF EXISTS idx_locations_name;
DROP INDEX IF EXISTS idx_locations_location_type;
DROP INDEX IF EXISTS idx_locations_tenant_name;
DROP INDEX IF EXISTS idx_locations_city;
DROP INDEX IF EXISTS idx_locations_is_active;

-- Drop table
DROP TABLE IF EXISTS locations;
