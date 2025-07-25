-- name: CreateCustomer :one
INSERT INTO customers (tenant_id, name, contact_person, email, phone, address, payment_mode, is_active)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
RETURNING *;

-- name: GetCustomerByID :one
SELECT * FROM customers
WHERE id = $1 AND tenant_id = $2;

-- name: UpdateCustomer :one
UPDATE customers
SET name = $2, contact_person = $3, email = $4, phone = $5, address = $6, payment_mode = $7, is_active = $8, updated_at = NOW()
WHERE id = $1 AND tenant_id = $9
RETURNING *;

-- name: ListCustomers :many
SELECT * FROM customers
WHERE tenant_id = $1 AND is_active = $2
ORDER BY name
LIMIT $3 OFFSET $4;
