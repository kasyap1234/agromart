-- name: AddInventoryQuantity :exec
INSERT INTO inventory (tenant_id, product_id, batch_id, quantity)
VALUES ($1, $2, $3, $4)
ON CONFLICT (tenant_id, product_id, batch_id)
DO UPDATE SET quantity = inventory.quantity + $4;

-- name: ReduceInventoryQuantity :exec
UPDATE inventory
SET quantity = quantity - $1
WHERE tenant_id = $2 AND product_id = $3 AND batch_id = $4;

-- name: GetProductQuantity :one
SELECT COALESCE(SUM(quantity), 0) AS total_quantity
FROM inventory
WHERE tenant_id = $1 AND product_id = $2;

-- name: GetProductInventoryDetails :many
SELECT b.batch_number, b.expiry_date, i.quantity
FROM inventory i
JOIN batches b ON i.batch_id = b.id
WHERE i.tenant_id = $1 AND i.product_id = $2
ORDER BY b.expiry_date ASC;

-- name: CreateInventoryLog :exec
INSERT INTO inventory_log (tenant_id, product_id, batch_id, transaction_type, quantity_change, reference_id, notes)
VALUES ($1, $2, $3, $4, $5, $6, $7);

-- name: GetInventoryByProductBatch :one
SELECT * FROM inventory
WHERE tenant_id = $1 AND product_id = $2 AND batch_id = $3;

-- name: SetInventoryQuantity :exec
UPDATE inventory
SET quantity = $1
WHERE tenant_id = $2 AND product_id = $3 AND batch_id = $4;

-- name: ListAllInventory :many
SELECT
    i.id,
    p.name AS product_name,
    p.sku,
    b.batch_number,
    b.expiry_date,
    i.quantity,
    u.abbreviation AS unit_abbreviation
FROM inventory i
JOIN products p ON i.product_id = p.id
JOIN batches b ON i.batch_id = b.id
JOIN units u ON p.unit_id = u.id
WHERE i.tenant_id = $1
ORDER BY p.name, b.expiry_date
LIMIT $2 OFFSET $3;

-- name: GetLowStockReport :many
SELECT p.id, p.name, p.sku, SUM(i.quantity) as total_quantity
FROM products p
JOIN inventory i ON p.id = i.product_id
WHERE p.tenant_id = $1
GROUP BY p.id
HAVING SUM(i.quantity) <= $2;

-- name: GetInventoryLogByProduct :many
SELECT * FROM inventory_log
WHERE tenant_id = $1 AND product_id = $2
ORDER BY transaction_date DESC
LIMIT $3 OFFSET $4;

-- name: GetInventoryLogByBatch :many
SELECT * FROM inventory_log
WHERE tenant_id = $1 AND batch_id = $2
ORDER BY transaction_date DESC
LIMIT $3 OFFSET $4;

-- name: GetExpiringBatches :many
-- Return integer days_until_expiry. Filter using a DATE upper bound so $2 remains a date.
SELECT
    b.id AS batch_id,
    b.batch_number,
    b.expiry_date,
    p.id AS product_id,
    p.name AS product_name,
    p.sku AS product_sku,
    i.quantity,
    GREATEST((b.expiry_date::date - CURRENT_DATE), 0) AS days_until_expiry
FROM batches b
JOIN products p ON b.product_id = p.id
JOIN inventory i ON b.id = i.batch_id
WHERE b.tenant_id = $1
  AND i.quantity > 0
  AND b.expiry_date IS NOT NULL
  AND b.expiry_date::date BETWEEN CURRENT_DATE AND $2::date
ORDER BY b.expiry_date ASC;

-- name: GetInventoryValue :one
SELECT COALESCE(SUM(i.quantity * b.cost), 0) as total_value
FROM inventory i
JOIN batches b ON i.batch_id = b.id
WHERE i.tenant_id = $1;

-- name: CountProductsByTenant :one
SELECT COUNT(*) FROM products
WHERE tenant_id = $1;
