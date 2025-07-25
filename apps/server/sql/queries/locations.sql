-- name: CreateLocation :one
INSERT INTO locations (tenant_id, name, address, city, state, postal_code, country, phone, email, location_type, is_active, notes)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
RETURNING *;

-- name: GetLocationByID :one
SELECT * FROM locations
WHERE id = $1 AND tenant_id = $2;

-- name: UpdateLocation :one
UPDATE locations
SET name = $2, address = $3, city = $4, state = $5, postal_code = $6, country = $7, phone = $8, email = $9, location_type = $10, is_active = $11, notes = $12, updated_at = NOW()
WHERE id = $1 AND tenant_id = $13
RETURNING *;

-- name: ListLocations :many
SELECT * FROM locations
WHERE tenant_id = $1 AND location_type = $2 AND is_active = $3
ORDER BY name
LIMIT $4 OFFSET $5;
