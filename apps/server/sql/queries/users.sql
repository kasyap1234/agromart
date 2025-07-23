-- name: GetUserByID :one
SELECT * FROM users WHERE id=$1;

-- name: GetUserBYEmail :one
SELECT * FROM users  WHERE email=$1;

-- name: CreateUser :one
INSERT INTO   users(email,password,role,)