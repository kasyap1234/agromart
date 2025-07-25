-- name: CreateBatch :one
INSERT INTO batches (tenant_id, product_id, batch_number, expiry_date, cost)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;

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
