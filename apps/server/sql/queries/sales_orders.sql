-- name: CreateSalesOrder :one
INSERT INTO sales_orders (tenant_id, so_number, customer_id, location_id, created_by)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- name: CreateSalesOrderItem :one
INSERT INTO sales_order_items (tenant_id, sales_order_id, product_id, quantity_ordered, unit_price, total_price)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING *;

-- name: GetSalesOrder :one
SELECT * FROM sales_orders
WHERE id = $1 AND tenant_id = $2;

-- name: GetSalesOrderItems :many
SELECT * FROM sales_order_items
WHERE sales_order_id = $1 AND tenant_id = $2;

-- name: UpdateSalesOrderStatus :exec
UPDATE sales_orders
SET status = $1
WHERE id = $2 AND tenant_id = $3;
