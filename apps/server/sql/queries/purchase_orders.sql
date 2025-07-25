-- name: CreatePurchaseOrder :one
INSERT INTO purchase_orders (tenant_id, po_number, supplier_id, location_id, created_by)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- name: CreatePurchaseOrderItem :one
INSERT INTO purchase_order_items (tenant_id, purchase_order_id, product_id, quantity_ordered, unit_cost, total_cost)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING *;

-- name: GetPurchaseOrder :one
SELECT * FROM purchase_orders
WHERE id = $1 AND tenant_id = $2;

-- name: GetPurchaseOrderItems :many
SELECT * FROM purchase_order_items
WHERE purchase_order_id = $1 AND tenant_id = $2;

-- name: UpdatePurchaseOrderStatus :exec
UPDATE purchase_orders
SET status = $1, approved_by = $2, approved_at = NOW()
WHERE id = $3 AND tenant_id = $4;
