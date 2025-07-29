package database

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"agromart2/db"
	"github.com/rs/zerolog/log"
)

// Service provides database operations and transaction management
type Service struct {
	pool    *pgxpool.Pool
	queries *db.Queries
}

// New creates a new database service
func New(pool *pgxpool.Pool) *Service {
	return &Service{
		pool:    pool,
		queries: db.New(pool),
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
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer func() {
		if err := tx.Rollback(ctx); err != nil && err != pgx.ErrTxClosed {
			log.Error().Err(err).Msg("failed to rollback transaction")
		}
	}()

	qtx := s.queries.WithTx(tx)
	if err := fn(qtx); err != nil {
		return err
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	return nil
}

// WithTxResult executes a function within a database transaction and returns a result
// Note: This is a simple implementation without generics for broader Go compatibility
func (s *Service) WithTxResult(ctx context.Context, fn func(*db.Queries) (interface{}, error)) (interface{}, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer func() {
		if err := tx.Rollback(ctx); err != nil && err != pgx.ErrTxClosed {
			log.Error().Err(err).Msg("failed to rollback transaction")
		}
	}()

	qtx := s.queries.WithTx(tx)
	result, err := fn(qtx)
	if err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	return result, nil
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
