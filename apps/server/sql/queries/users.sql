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
