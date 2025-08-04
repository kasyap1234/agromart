-- name: CreateUser :one
INSERT INTO users (name, email, password, phone, tenant_id, role)
VALUES ($1, $2, $3, $4, $5, $6::text)
RETURNING id, name, email, password, phone, tenant_id, role::text AS role, email_verified, is_active, created_at;

-- name: GetUserByEmail :one
SELECT id, name, email, password, phone, tenant_id, role::text AS role, email_verified, is_active, created_at FROM users
WHERE email = $1 AND tenant_id = $2;

-- name: GetUserByID :one
SELECT id, name, email, password, phone, tenant_id, role::text AS role, email_verified, is_active, created_at FROM users
WHERE id = $1;

-- name: UpdateUserPassword :exec
UPDATE users
SET password = $1
WHERE id = $2 AND tenant_id = $3;

-- name: ListUsersByRole :many
SELECT id, name, email, password, phone, tenant_id, role::text AS role, email_verified, is_active, created_at FROM users
WHERE tenant_id = $1 AND role = $2::text
ORDER BY name
LIMIT $3 OFFSET $4;

-- name: UpdateUser :one
UPDATE users
SET name = $2, email = $3, phone = $4, role = $5::text, email_verified = $6
WHERE id = $1 AND tenant_id = $7
RETURNING id, name, email, password, phone, tenant_id, role::text AS role, email_verified, is_active, created_at;