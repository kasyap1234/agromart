-- name: CreateUser :one
INSERT INTO users (name, email, password, phone, tenant_id, role)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING *;

-- name: GetUserByEmail :one
SELECT * FROM users
WHERE email = $1 AND tenant_id = $2;

-- name: GetUserByID :one
SELECT * FROM users
WHERE id = $1;

-- name: UpdateUserPassword :exec
UPDATE users
SET password = $1
WHERE id = $2 AND tenant_id = $3;

-- name: ListUsersByRole :many
SELECT * FROM users
WHERE tenant_id = $1 AND role = $2
ORDER BY name
LIMIT $3 OFFSET $4;

-- name: UpdateUser :one
UPDATE users
SET name = $2, email = $3, phone = $4, role = $5, email_verified = $6
WHERE id = $1 AND tenant_id = $7
RETURNING *;