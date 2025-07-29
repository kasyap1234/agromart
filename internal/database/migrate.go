package database

import (
	"context"
	"fmt"
	"path/filepath"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rs/zerolog/log"
)

// MigrationConfig holds migration configuration
type MigrationConfig struct {
	SchemaPath string
	TableName  string
}

// DefaultMigrationConfig returns default migration configuration
func DefaultMigrationConfig() *MigrationConfig {
	return &MigrationConfig{
		SchemaPath: "apps/server/sql/schema",
		TableName:  "schema_migrations",
	}
}

// Migrator handles database migrations
type Migrator struct {
	pool   *pgxpool.Pool
	config *MigrationConfig
}

// NewMigrator creates a new migrator instance
func NewMigrator(pool *pgxpool.Pool, config *MigrationConfig) *Migrator {
	if config == nil {
		config = DefaultMigrationConfig()
	}
	return &Migrator{
		pool:   pool,
		config: config,
	}
}

// CreateMigrationTable creates the migration tracking table if it doesn't exist
func (m *Migrator) CreateMigrationTable(ctx context.Context) error {
	query := fmt.Sprintf(`
		CREATE TABLE IF NOT EXISTS %s (
			version BIGINT PRIMARY KEY,
			dirty BOOLEAN NOT NULL DEFAULT FALSE,
			applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
		)
	`, m.config.TableName)

	_, err := m.pool.Exec(ctx, query)
	if err != nil {
		return fmt.Errorf("failed to create migration table: %w", err)
	}

	log.Info().Str("table", m.config.TableName).Msg("migration table ready")
	return nil
}

// GetCurrentVersion returns the current migration version
func (m *Migrator) GetCurrentVersion(ctx context.Context) (int64, error) {
	var version int64
	query := fmt.Sprintf("SELECT COALESCE(MAX(version), 0) FROM %s WHERE NOT dirty", m.config.TableName)
	
	err := m.pool.QueryRow(ctx, query).Scan(&version)
	if err != nil {
		return 0, fmt.Errorf("failed to get current version: %w", err)
	}

	return version, nil
}

// SetVersion sets the current migration version
func (m *Migrator) SetVersion(ctx context.Context, version int64, dirty bool) error {
	query := fmt.Sprintf(`
		INSERT INTO %s (version, dirty) 
		VALUES ($1, $2) 
		ON CONFLICT (version) 
		DO UPDATE SET dirty = $2, applied_at = NOW()
	`, m.config.TableName)

	_, err := m.pool.Exec(ctx, query, version, dirty)
	if err != nil {
		return fmt.Errorf("failed to set version: %w", err)
	}

	return nil
}

// CheckHealth verifies the migration table is accessible
func (m *Migrator) CheckHealth(ctx context.Context) error {
	query := fmt.Sprintf("SELECT 1 FROM %s LIMIT 1", m.config.TableName)
	_, err := m.pool.Exec(ctx, query)
	if err != nil {
		return fmt.Errorf("migration table health check failed: %w", err)
	}
	return nil
}

// GetMigrationFiles returns a list of migration files in the schema directory
// This is a helper function that you can extend based on your migration file naming convention
func (m *Migrator) GetMigrationFiles() ([]string, error) {
	pattern := filepath.Join(m.config.SchemaPath, "*.up.sql")
	matches, err := filepath.Glob(pattern)
	if err != nil {
		return nil, fmt.Errorf("failed to find migration files: %w", err)
	}
	return matches, nil
}

// Validate checks if the migrator is properly configured
func (m *Migrator) Validate() error {
	if m.pool == nil {
		return fmt.Errorf("database pool is nil")
	}
	if m.config.SchemaPath == "" {
		return fmt.Errorf("schema path is required")
	}
	if m.config.TableName == "" {
		return fmt.Errorf("migration table name is required")
	}
	return nil
}
