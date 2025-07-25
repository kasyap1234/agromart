-- name: CreateProduct :one
INSERT INTO products (tenant_id, sku, name, price, description, image_url, brand, unit_id, price_per_unit, gst_percent)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
RETURNING *;

-- name: GetProductBySKU :one
SELECT * FROM products
WHERE sku = $1 AND tenant_id = $2;

-- name: ListProducts :many
SELECT * FROM products
WHERE tenant_id = $1
ORDER BY created_at DESC
LIMIT $2 OFFSET $3;

-- name: CreateUnit :one
INSERT INTO units (tenant_id, name, abbreviation)
VALUES ($1, $2, $3)
RETURNING *;
