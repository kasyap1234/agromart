//go:build integration

package integration

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/base64"
	"fmt"
	"log"
	"os"
	"os/exec"
	"strings"
	"testing"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"
)

// minimal bcrypt-like placeholder: prefer using app's real hashing if exported.
// If backend expects bcrypt, but we can't import internals here, store a plain token
// and rely on login flow that compares with hashing function. If strict bcrypt is required,
// replace this with a known bcrypt hash for "password".
func hashPasswordFallback(pw string) string {
	sum := sha256.Sum256([]byte(pw))
	return "sha256:" + base64.StdEncoding.EncodeToString(sum[:])
}

// envOr returns the value of key or fallback if unset.
func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

// redactDSN hides password for logs
func redactDSN(dsn string) string {
	// Very basic redaction: replace :password@ with :***@
	i := strings.Index(dsn, "://")
	if i == -1 {
		return dsn
	}
	rest := dsn[i+3:]
	at := strings.Index(rest, "@")
	colon := strings.Index(rest, ":")
	if at != -1 && colon != -1 && colon < at {
		return dsn[:i+3] + rest[:colon] + ":***" + rest[at:]
	}
	return dsn
}

// runMigrations tries to run database migrations using the migrate CLI if available.
// It uses MIGRATIONS_PATH if set, else tries repo-relative paths.
func runMigrations(dsn string) {
	// Prefer MIGRATIONS_PATH env as used in compose
	migrationsPath := os.Getenv("MIGRATIONS_PATH")
	if migrationsPath == "" {
		// Try repo paths
		candidates := []string{
			"./apps/server/sql/schema",
			"./sql/schema",
		}
		for _, p := range candidates {
			if fi, err := os.Stat(p); err == nil && fi.IsDir() {
				migrationsPath = p
				break
			}
		}
	}

	// If still empty, skip with notice
	if migrationsPath == "" {
		log.Printf("[integration] no migrations path found; skipping migrate")
		return
	}

	// Check migrate binary
	if _, err := exec.LookPath("migrate"); err != nil {
		log.Printf("[integration] migrate not found in PATH, skipping auto-migration (err=%v). Ensure DB is migrated.", err)
		return
	}

	// Use file:// source prefix
	src := "file://" + migrationsPath
	cmd := exec.Command("migrate", "-path", src, "-database", dsn, "up")
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	log.Printf("[integration] running migrations: migrate -path %s -database %s up", src, redactDSN(dsn))
	if err := cmd.Run(); err != nil {
		msg := strings.ToLower(err.Error())
		if !strings.Contains(msg, "no change") {
			log.Printf("[integration] migrate up returned non-zero: %v (continuing)", err)
		}
	}
}

func seedAdmin(db *sql.DB) error {
	ctx, cancel := context.WithTimeout(context.Background(), 8*time.Second)
	defer cancel()

	// Ensure default tenant (UPSERT with all NOT NULL columns)
	var tenantID string
	// First try to select existing tenant
	err := db.QueryRowContext(ctx, `SELECT id::text FROM tenants WHERE name = 'default' LIMIT 1`).Scan(&tenantID)
	if err == sql.ErrNoRows {
		// If no tenant exists, create one
		err = db.QueryRowContext(ctx, `
			INSERT INTO tenants(name, email, phone, is_active)
			VALUES($1, $2, $3, TRUE)
			RETURNING id::text
		`, "default", "default@example.com", "0000000000").Scan(&tenantID)
		if err != nil {
			return fmt.Errorf("insert tenant: %w", err)
		}
	} else if err != nil {
		return fmt.Errorf("select tenant: %w", err)
	}

	const email = "admin@example.com"
	const password = "AdminPassword123!"

	// Upsert user with deterministic email
	var userID string
	err = db.QueryRowContext(ctx, `SELECT id::text FROM users WHERE email = $1 LIMIT 1`, email).Scan(&userID)
	if err == sql.ErrNoRows {
		// Use a pre-computed bcrypt hash for AdminPassword123!
		pwHash := "$2a$10$WTqKIZuklMLl2kNKRPuuj.MdRhRpLy6Cv93NqzAYXWn/C8OWl.P6O"
		// Your users DDL requires: name TEXT NOT NULL, email UNIQUE NOT NULL, password TEXT NOT NULL, phone TEXT NOT NULL, tenant_id UUID NOT NULL, role user_role NOT NULL
		if err2 := db.QueryRowContext(ctx, `
			INSERT INTO users(name, email, password, phone, tenant_id, role)
			VALUES ($1, $2, $3, $4, $5, 'admin')
			ON CONFLICT (email) DO UPDATE SET
				name = EXCLUDED.name,
				phone = EXCLUDED.phone,
				role = EXCLUDED.role
			RETURNING id::text
		`, "Admin", email, pwHash, "0000000000", tenantID).Scan(&userID); err2 != nil {
			return fmt.Errorf("insert admin: %w", err2)
		}
		log.Printf("seeded admin user %s under tenant %s", email, tenantID)
	} else if err != nil {
		return fmt.Errorf("select user: %w", err)
	}
	return nil
}

func TestMain(m *testing.M) {
	// Prefer DATABASE_URL env. If empty, derive from .env variables typical to compose.
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		// Derive from env or sensible defaults
		dbUser := envOr("DB_USER", "postgres")
		dbPass := envOr("DB_PASSWORD", "secret")
		dbHost := envOr("DB_HOST", "localhost")
		dbPort := envOr("DB_PORT", "5432")
		dbName := envOr("DB_NAME", "inventory")
		dsn = fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=disable", dbUser, dbPass, dbHost, dbPort, dbName)
	}

	db, err := sql.Open("pgx", dsn)
	if err != nil {
		log.Fatalf("open db: %v", err)
	}
	defer db.Close()

	// Retry until DB is ready.
	deadline := time.Now().Add(30 * time.Second)
	for {
		if err = db.Ping(); err == nil {
			break
		}
		if time.Now().After(deadline) {
			log.Fatalf("db ping timeout: %v", err)
		}
		time.Sleep(500 * time.Millisecond)
	}

	if err := seedAdmin(db); err != nil {
		log.Fatalf("seed admin failed: %v", err)
	}

	code := m.Run()
	os.Exit(code)
}
