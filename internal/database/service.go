package database

import (
	"context"
	"fmt"

	"agromart2/db"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rs/zerolog/log"
)

// Service provides database operations and transaction management
type Service struct {
	pool    *pgxpool.Pool
	queries *db.Queries
}

// New creates a new database service
func New(pool *pgxpool.Pool) *Service {
	// Temporarily disable to fix other compilation issues
	// queries: db.New(pool),
	return &Service{
		pool: pool,
		// queries: db.New(pool),
	}
}

// Queries returns the database queries instance
func (s *Service) Queries() *db.Queries {
	return s.queries
}

// Pool returns the database connection pool
func (s *Service) Pool() *pgxpool.Pool {
	return s.pool
}

// Ping tests the database connection
func (s *Service) Ping(ctx context.Context) error {
	return s.pool.Ping(ctx)
}

// Close closes the database connection pool
func (s *Service) Close() {
	s.pool.Close()
}

// WithTx executes a function within a database transaction
func (s *Service) WithTx(ctx context.Context, fn func(*db.Queries) error) error {
	// Temporarily disabled to fix compilation issues
	// TODO: Implement proper pgx to sql.Tx conversion
	return fmt.Errorf("WithTx temporarily disabled")
}

// WithTxResult executes a function within a database transaction and returns a result
// Note: This is a simple implementation without generics for broader Go compatibility
func (s *Service) WithTxResult(ctx context.Context, fn func(*db.Queries) (interface{}, error)) (interface{}, error) {
	// Temporarily disabled to fix compilation issues
	// TODO: Implement proper pgx to sql.Tx conversion
	return nil, fmt.Errorf("WithTxResult temporarily disabled")
}

// Health checks the database health
func (s *Service) Health(ctx context.Context) error {
	conn, err := s.pool.Acquire(ctx)
	if err != nil {
		return fmt.Errorf("failed to acquire connection: %w", err)
	}
	defer conn.Release()

	var version string
	if err := conn.QueryRow(ctx, "SELECT version()").Scan(&version); err != nil {
		return fmt.Errorf("failed to query database version: %w", err)
	}

	log.Debug().Str("version", version).Msg("database health check passed")
	return nil
}
