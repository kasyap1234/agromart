-- name: CreateTenant :one
INSERT INTO tenants (name, email, phone, address, registration_number)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- name: GetTenantByID :one
SELECT * FROM tenants
WHERE id = $1;

-- name: UpdateTenant :one
UPDATE tenants
SET name = $2, email = $3, phone = $4, address = $5, registration_number = $6, is_active = $7
WHERE id = $1
RETURNING *;

-- name: ListTenants :many
SELECT * FROM tenants
ORDER BY created_at DESC
LIMIT $1 OFFSET $2;
