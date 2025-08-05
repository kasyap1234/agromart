-- Analytics and Reporting SQLC queries

-- NOTE: Do NOT duplicate existing query names from other files.
-- Inventory value already exists in inventory.sql as GetInventoryValue.
-- Using a different name here for completeness if needed elsewhere.

-- name: GetInventoryValueAnalytics :one
SELECT COALESCE(SUM(i.quantity * b.cost), 0) AS total_value
FROM inventory i
JOIN batches b ON i.batch_id = b.id
WHERE i.tenant_id = $1;

-- name: GetStockoutRiskCount :one
SELECT COALESCE(COUNT(*), 0) AS stockout_risk_count
FROM (
  SELECT p.id
  FROM products p
  LEFT JOIN inventory i
    ON i.product_id = p.id
   AND i.tenant_id = p.tenant_id
  WHERE p.tenant_id = $1
  GROUP BY p.id
  HAVING SUM(COALESCE(i.quantity, 0)) <= $2
) t;

-- name: CountOpenSalesOrders :one
SELECT COUNT(*) AS open_sales_orders_count
FROM sales_orders so
WHERE so.tenant_id = $1
  AND so.status IN ('DRAFT','CONFIRMED','SHIPPED')
  AND so.order_date BETWEEN $2 AND $3;

-- name: CountOpenPurchaseOrders :one
SELECT COUNT(*) AS open_purchase_orders_count
FROM purchase_orders po
WHERE po.tenant_id = $1
  AND po.status IN ('DRAFT','ISSUED','RECEIVED')
  AND po.order_date BETWEEN $2 AND $3;

-- name: GetRevenueInPeriod :one
SELECT COALESCE(SUM(soi.total_price), 0) AS revenue_in_period
FROM sales_order_items soi
JOIN sales_orders so
  ON so.id = soi.sales_order_id
 AND so.tenant_id = soi.tenant_id
WHERE soi.tenant_id = $1
  AND so.status IN ('SHIPPED','DELIVERED')
  AND so.order_date BETWEEN $2 AND $3;

-- name: GetTopProductsByRevenue :many
SELECT
  p.id        AS product_id,
  p.name      AS product_name,
  p.sku       AS product_sku,
  SUM(soi.total_price) AS revenue
FROM sales_order_items soi
JOIN sales_orders so
  ON so.id = soi.sales_order_id
 AND so.tenant_id = soi.tenant_id
JOIN products p
  ON p.id = soi.product_id
 AND p.tenant_id = soi.tenant_id
WHERE soi.tenant_id = $1
  AND so.status IN ('SHIPPED','DELIVERED')
  AND so.order_date BETWEEN $2 AND $3
GROUP BY p.id, p.name, p.sku
ORDER BY revenue DESC
LIMIT $4;

-- name: CountExpiringBatchesWithinDays :one
-- Pass an upper bound date (e.g., CURRENT_DATE + interval '30 days') from Go layer.
SELECT COALESCE(COUNT(*), 0) AS expiring_batches_count
FROM (
  SELECT b.id
  FROM batches b
  JOIN inventory i ON i.batch_id = b.id
  WHERE b.tenant_id = $1
    AND i.quantity > 0
    AND b.expiry_date IS NOT NULL
    AND b.expiry_date::date BETWEEN CURRENT_DATE AND ($2)::date
) t;

-- name: GetSalesTimeSeries :many
-- grp is 'day' or 'month'
SELECT
  date_trunc(sqlc.arg('grp')::text, so.order_date) AS period,
  COALESCE(SUM(soi.total_price), 0) AS revenue
FROM sales_order_items soi
JOIN sales_orders so
  ON so.id = soi.sales_order_id
 AND so.tenant_id = soi.tenant_id
WHERE soi.tenant_id = sqlc.arg('tenant_id')
  AND so.status IN ('SHIPPED','DELIVERED')
  AND so.order_date BETWEEN sqlc.arg('from_date') AND sqlc.arg('to_date')
GROUP BY period
ORDER BY period;

-- name: GetPurchasesTimeSeries :many
SELECT
  date_trunc(sqlc.arg('grp')::text, po.order_date) AS period,
  COALESCE(SUM(poi.total_cost), 0) AS total_cost
FROM purchase_order_items poi
JOIN purchase_orders po
  ON po.id = poi.purchase_order_id
 AND po.tenant_id = poi.tenant_id
WHERE poi.tenant_id = sqlc.arg('tenant_id')
  AND po.status IN ('RECEIVED','CLOSED')
  AND po.order_date BETWEEN sqlc.arg('from_date') AND sqlc.arg('to_date')
GROUP BY period
ORDER BY period;