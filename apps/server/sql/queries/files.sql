-- name: CreateFile :one
INSERT INTO files (
    tenant_id, original_name, file_name, file_path, file_size, mime_type,
    file_type, entity_type, entity_id, width, height, compression_applied,
    virus_scanned, virus_scan_status, checksum, bucket_name, object_key,
    is_public, uploaded_by, expires_at
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
    $16, $17, $18, $19, $20
) RETURNING *;

-- name: GetFile :one
SELECT * FROM files WHERE id = $1 AND tenant_id = $2;

-- name: GetFilesByEntity :many
SELECT * FROM files
WHERE entity_type = $1 AND entity_id = $2 AND tenant_id = $3
ORDER BY created_at DESC;

-- name: GetFilesByType :many
SELECT * FROM files
WHERE file_type = $1 AND tenant_id = $2
ORDER BY created_at DESC
LIMIT $3 OFFSET $4;

-- name: UpdateFileVirusScan :exec
UPDATE files
SET virus_scanned = $1, virus_scan_status = $2, updated_at = NOW()
WHERE id = $3;

-- name: UpdateFileMetadata :exec
UPDATE files
SET width = $1, height = $2, compression_applied = $3, checksum = $4, updated_at = NOW()
WHERE id = $5;

-- name: DeleteFile :exec
DELETE FROM files WHERE id = $1 AND tenant_id = $2;

-- name: DeleteExpiredFiles :exec
DELETE FROM files WHERE expires_at < NOW();

-- name: GetFilesByUser :many
SELECT * FROM files
WHERE uploaded_by = $1 AND tenant_id = $2
ORDER BY created_at DESC
LIMIT $3 OFFSET $4;

-- name: GetPendingVirusScans :many
SELECT * FROM files
WHERE virus_scanned = false AND tenant_id = $1
ORDER BY created_at ASC
LIMIT $2;

-- name: GetFilesByMimeType :many
SELECT * FROM files
WHERE mime_type = $1 AND tenant_id = $2
ORDER BY created_at DESC
LIMIT $3 OFFSET $4;

-- name: GetFileByChecksum :one
SELECT * FROM files
WHERE checksum = $1 AND tenant_id = $2;