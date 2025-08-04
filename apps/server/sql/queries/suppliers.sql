-- name: CreateSupplier :one
INSERT INTO suppliers (tenant_id, name, contact_person, email, phone, address, tax_id, payment_mode)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
RETURNING *;

-- name: GetSupplierByID :one
SELECT * FROM suppliers
WHERE id = $1 AND tenant_id = $2;

-- name: UpdateSupplier :one
UPDATE suppliers
SET name = $2, contact_person = $3, email = $4, phone = $5, address = $6, tax_id = $7, payment_mode = $8, is_active = $9
WHERE id = $1 AND tenant_id = $10
RETURNING *;

-- name: ListSuppliers :many
SELECT * FROM suppliers
WHERE tenant_id = $1
ORDER BY name
LIMIT $2 OFFSET $3;

-- name: ListActiveSuppliers :many
SELECT * FROM suppliers
WHERE tenant_id = $1 AND (is_active IS NULL OR is_active = true)
ORDER BY name
LIMIT $2 OFFSET $3;

-- name: SearchSuppliers :many
SELECT * FROM suppliers
WHERE tenant_id = $1 AND name ILIKE $2
ORDER BY name
LIMIT $3 OFFSET $4;

-- name: CountSuppliers :one
SELECT COUNT(*) FROM suppliers
WHERE tenant_id = $1;

-- name: CheckSupplierExists :one
SELECT EXISTS(
    SELECT 1 FROM suppliers
    WHERE id = $1 AND tenant_id = $2
);

-- name: DeactivateSupplier :exec
UPDATE suppliers
SET is_active = false
WHERE id = $1 AND tenant_id = $2;

-- name: GetSupplierByName :one
SELECT * FROM suppliers
WHERE tenant_id = $1 AND name = $2;
