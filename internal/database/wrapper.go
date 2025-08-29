package database

import (
	"context"
	"database/sql"
	"database/sql/driver"

	"github.com/jackc/pgx/v5/pgxpool"
)

// PgxWrapper wraps a pgx pool to implement database/sql interfaces
type PgxWrapper struct {
	pool *pgxpool.Pool
}

// NewPgxWrapper creates a new wrapper around a pgx pool
func NewPgxWrapper(pool *pgxpool.Pool) *PgxWrapper {
	return &PgxWrapper{pool: pool}
}

// GetRawPool returns the underlying pgx pool for direct usage
func (w *PgxWrapper) GetRawPool() *pgxpool.Pool {
	return w.pool
}

// ExecContext implements sql.ExecerContext
func (w *PgxWrapper) ExecContext(ctx context.Context, query string, args ...interface{}) (sql.Result, error) {
	conn, err := w.pool.Acquire(ctx)
	if err != nil {
		return nil, err
	}
	defer conn.Release()

	// Convert args to proper types for pgx
	pgxArgs := make([]interface{}, len(args))
	for i, arg := range args {
		pgxArgs[i] = arg
	}

	result, err := conn.Exec(ctx, query, pgxArgs...)
	if err != nil {
		return nil, err
	}

	// Convert pgx result to sql.Result
	return &PgxResult{rowsAffected: result.RowsAffected()}, nil
}

// QueryContext implements sql.QueryerContext - simplified for now
func (w *PgxWrapper) QueryContext(ctx context.Context, query string, args ...interface{}) (*sql.Rows, error) {
	// For now, return an error to avoid nil dereference
	// This forces the application to use the pool directly
	return nil, sql.ErrConnDone
}

// QueryRowContext implements sql.QueryerContext - simplified for now
func (w *PgxWrapper) QueryRowContext(ctx context.Context, query string, args ...interface{}) *sql.Row {
	// For now, return nil to avoid crashes
	return nil
}

// PrepareContext implements sql.PreparerContext
func (w *PgxWrapper) PrepareContext(ctx context.Context, query string) (*sql.Stmt, error) {
	// This is a simplified implementation
	// In production, you'd want to properly implement statement preparation
	return nil, driver.ErrSkip
}

// PgxResult implements sql.Result
type PgxResult struct {
	rowsAffected int64
}

func (r *PgxResult) LastInsertId() (int64, error) {
	return 0, sql.ErrNoRows // pgx doesn't support this directly
}

func (r *PgxResult) RowsAffected() (int64, error) {
	return r.rowsAffected, nil
}

// Helper methods for direct pgx usage

// QuerySingleRow performs a query that should return a single row
func (w *PgxWrapper) QuerySingleRow(ctx context.Context, query string, args ...interface{}) (map[string]interface{}, error) {
	conn, err := w.pool.Acquire(ctx)
	if err != nil {
		return nil, err
	}
	defer conn.Release()

	rows, err := conn.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	if !rows.Next() {
		return nil, sql.ErrNoRows
	}

	// Get column names
	fieldDescriptions := rows.FieldDescriptions()
	values := make([]interface{}, len(fieldDescriptions))
	valuePtrs := make([]interface{}, len(values))
	for i := range values {
		valuePtrs[i] = &values[i]
	}

	if err := rows.Scan(valuePtrs...); err != nil {
		return nil, err
	}

	// Convert to map
	result := make(map[string]interface{})
	for i, desc := range fieldDescriptions {
		result[desc.Name] = values[i]
	}

	return result, nil
}
