-- name: CreateLocation :one
INSERT INTO locations (tenant_id, name, address, city, state, postal_code, country, phone, email, location_type, capacity, capacity_unit, manager_id, operating_hours, temperature_controlled, security_level, is_active, notes)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
RETURNING *;

-- name: GetLocationByID :one
SELECT * FROM locations
WHERE id = $1 AND tenant_id = $2;

-- name: UpdateLocation :one
UPDATE locations
SET name = $2, address = $3, city = $4, state = $5, postal_code = $6, country = $7, phone = $8, email = $9, location_type = $10, capacity = $11, capacity_unit = $12, manager_id = $13, operating_hours = $14, temperature_controlled = $15, security_level = $16, is_active = $17, notes = $18, updated_at = NOW()
WHERE id = $1 AND tenant_id = $19
RETURNING *;

-- name: ListLocations :many
SELECT * FROM locations
WHERE tenant_id = $1 AND location_type = $2 AND is_active = $3
ORDER BY name
LIMIT $4 OFFSET $5;

-- name: ListLocationsByType :many
SELECT * FROM locations
WHERE tenant_id = $1 AND location_type = $2
ORDER BY name;

-- name: ListActiveLocations :many
SELECT * FROM locations
WHERE tenant_id = $1 AND is_active = TRUE
ORDER BY name;

-- name: DeleteLocation :exec
UPDATE locations
SET is_active = FALSE, updated_at = NOW()
WHERE id = $1 AND tenant_id = $2;

-- name: GetLocationsByManager :many
SELECT * FROM locations
WHERE tenant_id = $1 AND manager_id = $2 AND is_active = TRUE
ORDER BY name;

-- name: GetLocationsWithCapacity :many
SELECT * FROM locations
WHERE tenant_id = $1 AND capacity IS NOT NULL AND is_active = TRUE
ORDER BY capacity DESC;
