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

-- name: GetProductByID :one
SELECT * FROM products
WHERE id = $1 AND tenant_id = $2;

-- name: UpdateProductDetails :one
UPDATE products
SET name = $2, price = $3, description = $4, image_url = $5, brand = $6, unit_id = $7, price_per_unit = $8, gst_percent = $9
WHERE id = $1 AND tenant_id = $10
RETURNING *;

-- name: SearchProducts :many
SELECT * FROM products
WHERE tenant_id = $1 AND (name ILIKE $2 OR sku ILIKE $2)
ORDER BY name
LIMIT $3 OFFSET $4;

-- name: CheckProductExists :one
SELECT EXISTS(SELECT 1 FROM products WHERE id = $1 AND tenant_id = $2);

-- name: CountProducts :one
SELECT COUNT(*) FROM products WHERE tenant_id = $1;

-- name: GetUnitByID :one
SELECT * FROM units
WHERE id = $1 AND tenant_id = $2;

-- name: UpdateUnit :one
UPDATE units
SET name = $2, abbreviation = $3
WHERE id = $1 AND tenant_id = $4
RETURNING *;

-- name: ListUnits :many
SELECT * FROM units
WHERE tenant_id = $1
ORDER BY name
LIMIT $2 OFFSET $3;

-- name: UpdateProductPatch :exec 
UPDATE products
SET
  name = COALESCE(sqlc.narg('name'), name),
  price = COALESCE(sqlc.narg('price'), price),
  description = COALESCE(sqlc.narg('description'), description),
  brand=COALESCE(sqlc.narg('brand'),brand),
  image_url = COALESCE(sqlc.narg('image_url'), image_url),
  price_per_unit = COALESCE(sqlc.narg('price_per_unit'), price_per_unit),
  gst_percent = COALESCE(sqlc.narg('gst_percent'), gst_percent),
  unit_id = COALESCE(sqlc.narg('unit_id'), unit_id)
WHERE id = sqlc.arg('id') AND tenant_id = sqlc.arg('tenant_id');
