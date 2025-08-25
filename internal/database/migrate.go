package database

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rs/zerolog/log"
)

// Migration represents a database migration
type Migration struct {
	Version string
	Script  string
}

// RunMigrations runs all migrations from the given directory
func RunMigrations(ctx context.Context, pool *pgxpool.Pool, migrationDir string) error {
	// Create the schema_migrations table if it doesn't exist
	createTableSQL := `
		CREATE TABLE IF NOT EXISTS schema_migrations (
			version VARCHAR(255) PRIMARY KEY,
			applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)
	`
	_, err := pool.Exec(ctx, createTableSQL)
	if err != nil {
		return fmt.Errorf("failed to create schema_migrations table: %w", err)
	}

	// Read migration files
	files, err := os.ReadDir(migrationDir)
	if err != nil {
		return fmt.Errorf("failed to read migration directory: %w", err)
	}

	// Collect migration files (only .up.sql)
	migrations := []Migration{}
	for _, file := range files {
		if file.IsDir() {
			continue
		}
		if strings.HasSuffix(file.Name(), ".up.sql") {
			// Extract only the numeric prefix (e.g., "000001" from "000001_create_tenant_tables.up.sql")
			filenameWithoutExt := strings.TrimSuffix(file.Name(), ".up.sql")
			parts := strings.SplitN(filenameWithoutExt, "_", 2)
			var version string
			if len(parts) > 0 {
				version = parts[0]
			} else {
				version = filenameWithoutExt
			}
			
			path := filepath.Join(migrationDir, file.Name())
			script, err := os.ReadFile(path)
			if err != nil {
				return fmt.Errorf("failed to read migration file %s: %w", path, err)
			}
			migrations = append(migrations, Migration{
				Version: version,  // Use only the numeric prefix
				Script:  string(script),
			})
		}
	}

	// Sort migrations by version (lexicographical order by file name, which should be numeric)
	sort.Slice(migrations, func(i, j int) bool {
		return migrations[i].Version < migrations[j].Version
	})

	// Run each migration if not applied
	for _, migration := range migrations {
		var exists bool
		err := pool.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM schema_migrations WHERE version = $1)", migration.Version).Scan(&exists)
		if err != nil {
			return fmt.Errorf("failed to check migration version %s: %w", migration.Version, err)
		}

		if exists {
			log.Info().Str("version", migration.Version).Msg("migration already applied")
			continue
		}

		// Begin transaction
		tx, err := pool.Begin(ctx)
		if err != nil {
			return fmt.Errorf("failed to begin transaction for migration %s: %w", migration.Version, err)
		}

		// Execute migration script
		_, err = tx.Exec(ctx, migration.Script)
		if err != nil {
			tx.Rollback(ctx)
			return fmt.Errorf("failed to execute migration %s: %w", migration.Version, err)
		}

		// Record migration
		_, err = tx.Exec(ctx, "INSERT INTO schema_migrations (version) VALUES ($1)", migration.Version)
		if err != nil {
			tx.Rollback(ctx)
			return fmt.Errorf("failed to record migration %s: %w", migration.Version, err)
		}

		err = tx.Commit(ctx)
		if err != nil {
			return fmt.Errorf("failed to commit migration %s: %w", migration.Version, err)
		}

		log.Info().Str("version", migration.Version).Msg("migration applied")
	}

	return nil
}
