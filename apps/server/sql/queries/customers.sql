-- name: CreateCustomer :one
INSERT INTO customers (tenant_id, name, contact_person, email, phone, address, payment_mode)
VALUES ($1, $2, $3, $4, $5, $6, $7)
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
WHERE tenant_id = $1
ORDER BY name
LIMIT $2 OFFSET $3;

-- name: ListActiveCustomers :many
SELECT * FROM customers
WHERE tenant_id = $1 AND (is_active IS NULL OR is_active = true)
ORDER BY name
LIMIT $2 OFFSET $3;

-- name: SearchCustomers :many
SELECT * FROM customers
WHERE tenant_id = $1 AND name ILIKE $2
ORDER BY name
LIMIT $3 OFFSET $4;

-- name: CountCustomers :one
SELECT COUNT(*) FROM customers
WHERE tenant_id = $1;

-- name: CheckCustomerExists :one
SELECT EXISTS(
    SELECT 1 FROM customers
    WHERE id = $1 AND tenant_id = $2
);

-- name: DeactivateCustomer :exec
UPDATE customers
SET is_active = false, updated_at = NOW()
WHERE id = $1 AND tenant_id = $2;

-- name: GetCustomerByName :one
SELECT * FROM customers
WHERE tenant_id = $1 AND name = $2;
