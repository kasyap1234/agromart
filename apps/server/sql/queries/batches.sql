-- name: CreateBatch :one
INSERT INTO batches (tenant_id, product_id, batch_number, expiry_date, cost)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- name: GetBatchByID :one
SELECT * FROM batches
WHERE id = $1 AND tenant_id = $2;

-- name: UpdateBatch :one
UPDATE batches
SET batch_number = $2, expiry_date = $3, cost = $4
WHERE id = $1 AND tenant_id = $5
RETURNING *;

-- name: DeleteBatch :exec
DELETE FROM batches
WHERE id = $1 AND tenant_id = $2;

-- name: ListBatches :many
SELECT * FROM batches
WHERE tenant_id = $1
ORDER BY id LIMIT $2 OFFSET $3;
