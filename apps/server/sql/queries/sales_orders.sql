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

-- name: ListSalesOrdersByCustomer :many
SELECT * FROM sales_orders
WHERE tenant_id = $1 AND customer_id = $2
ORDER BY order_date DESC
LIMIT $3 OFFSET $4;

-- name: UpdateSalesOrderItemQuantityShipped :one
UPDATE sales_order_items
SET quantity_shipped = $2, updated_at = NOW()
WHERE id = $1 AND tenant_id = $3
RETURNING *;

-- name: GetSalesReportByDate :many
SELECT
    p.name as product_name,
    SUM(soi.quantity_shipped) as total_units_sold,
    SUM(soi.total_price) as total_revenue
FROM sales_order_items soi
JOIN products p ON soi.product_id = p.id
JOIN sales_orders so ON soi.sales_order_id = so.id
WHERE soi.tenant_id = $1
  AND so.order_date BETWEEN $2 AND $3
  AND so.status = 'DELIVERED' -- or 'SHIPPED'
GROUP BY p.name
ORDER BY total_revenue DESC;

-- name: GetSalesOrderItemByID :one
SELECT * FROM sales_order_items
WHERE id = $1 AND tenant_id = $2;

-- name: GetCustomerSalesSummary :many
SELECT
    c.name AS customer_name,
    SUM(so.final_amount) AS total_sales_amount,
    COUNT(so.id) AS total_orders
FROM customers c
JOIN sales_orders so ON c.id = so.customer_id AND c.tenant_id = so.tenant_id
WHERE c.tenant_id = $1
GROUP BY c.id, c.name
ORDER BY total_sales_amount DESC;
