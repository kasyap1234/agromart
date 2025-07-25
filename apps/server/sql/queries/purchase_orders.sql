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

-- name: ListPurchaseOrdersByStatus :many
SELECT * FROM purchase_orders
WHERE tenant_id = $1 AND status = $2
ORDER BY order_date DESC
LIMIT $3 OFFSET $4;

-- name: ListPurchaseOrdersBySupplier :many
SELECT * FROM purchase_orders
WHERE tenant_id = $1 AND supplier_id = $2
ORDER BY order_date DESC
LIMIT $3 OFFSET $4;

-- name: UpdatePurchaseOrderItemQuantityReceived :one
UPDATE purchase_order_items
SET quantity_received = $2, updated_at = NOW()
WHERE id = $1 AND tenant_id = $3
RETURNING *;

-- name: GetPurchaseOrderItemByID :one
SELECT * FROM purchase_order_items
WHERE id = $1 AND tenant_id = $2;

-- name: GetProductMovementReport :many
SELECT
    p.name AS product_name,
    SUM(COALESCE(poi.quantity_ordered, 0)) AS total_purchased,
    SUM(COALESCE(soi.quantity_ordered, 0)) AS total_sold
FROM products p
LEFT JOIN purchase_order_items poi ON p.id = poi.product_id AND p.tenant_id = poi.tenant_id
LEFT JOIN sales_order_items soi ON p.id = soi.product_id AND p.tenant_id = soi.tenant_id
WHERE p.tenant_id = $1
GROUP BY p.id, p.name
ORDER BY p.name;

-- name: GetSupplierPurchaseSummary :many
SELECT
    s.name AS supplier_name,
    SUM(po.final_amount) AS total_purchased_amount,
    COUNT(po.id) AS total_orders
FROM suppliers s
JOIN purchase_orders po ON s.id = po.supplier_id AND s.tenant_id = po.tenant_id
WHERE s.tenant_id = $1
GROUP BY s.id, s.name
ORDER BY total_purchased_amount DESC;
