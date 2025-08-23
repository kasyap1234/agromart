package tests

import (
	"database/sql"
	"fmt"
	"os"
	"testing"
	"time"

	"agromart2/db"
	"github.com/google/uuid"
	_ "github.com/jackc/pgx/v5/stdlib"
)

// TestDB holds test database connection and utilities
type TestDB struct {
	DB      *db.Queries
	SQLDB   *sql.DB
	CloseFn func()
}

// TestTenant represents a test tenant
type TestTenant struct {
	ID   uuid.UUID
	Name string
}

// TestUser represents a test user
type TestUser struct {
	ID       uuid.UUID
	Email    string
	Password string
	Role     string
	TenantID uuid.UUID
}

// TestLocation represents a test location
type TestLocation struct {
	ID           uuid.UUID
	Name         string
	LocationType string
	TenantID     uuid.UUID
}

// TestProduct represents a test product
type TestProduct struct {
	ID       uuid.UUID
	Name     string
	SKU      string
	TenantID uuid.UUID
}

// TestBatch represents a test batch
type TestBatch struct {
	ID         uuid.UUID
	BatchNo    string
	ProductID  uuid.UUID
	TenantID   uuid.UUID
}

// TestInventory represents test inventory
type TestInventory struct {
	ID         uuid.UUID
	ProductID  uuid.UUID
	BatchID    uuid.UUID
	LocationID uuid.UUID
	Quantity   float64
	TenantID   uuid.UUID
}

// SetupTestDBWithRealDB creates test setup using real database connection
func SetupTestDBWithRealDB(t *testing.T) *TestDB {
	// Get database URL from environment
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgres://user:password@localhost:5432/agromart_test?sslmode=disable"
	}

	// Connect to database
	dbConn, err := sql.Open("pgx", dbURL)
	if err != nil {
		t.Fatalf("Failed to connect to database: %v", err)
	}

	// Test connection
	if err := dbConn.Ping(); err != nil {
		t.Fatalf("Failed to ping database: %v", err)
	}

	// Clean up test data
	cleanupTestData(t, dbConn)

	// Ensure tables exist
	if err := ensureTablesExist(dbConn); err != nil {
		t.Fatalf("Failed to ensure tables exist: %v", err)
	}

	// Create sqlc queries instance
	queries := db.New(dbConn)

	return &TestDB{
		DB:    queries,
		SQLDB: dbConn,
		CloseFn: func() {
			cleanupTestData(t, dbConn)
			dbConn.Close()
		},
	}
}

// ensureTablesExist ensures all required tables exist
func ensureTablesExist(db *sql.DB) error {
	// This is a simplified version - in real implementation, you'd use proper migration tools
	// For now, we'll assume tables exist or create minimal test versions

	// Check if we can insert test data - if not, tables might not exist
	testSQL := `
		-- Test if basic tables exist by trying to count rows
		SELECT COUNT(*) FROM tenants LIMIT 1;
	`
	_, err := db.Exec(testSQL)
	if err != nil {
		// Tables might not exist, try to create minimal versions for testing
		setupSQL := `
			CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

			DO $$ BEGIN
				IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
					CREATE TYPE user_role AS ENUM ('admin', 'user', 'supervisor', 'manager', 'super_admin');
				END IF;
			END $$;

			CREATE TABLE IF NOT EXISTS tenants (
				id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
				name TEXT NOT NULL,
				domain TEXT UNIQUE,
				is_active BOOLEAN DEFAULT TRUE,
				created_at TIMESTAMPTZ DEFAULT NOW()
			);

			CREATE TABLE IF NOT EXISTS users (
				id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
				name TEXT NOT NULL,
				email TEXT UNIQUE NOT NULL,
				password TEXT NOT NULL,
				phone TEXT NOT NULL,
				tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
				role user_role NOT NULL DEFAULT 'user',
				email_verified BOOLEAN DEFAULT FALSE,
				is_active BOOLEAN DEFAULT TRUE,
				created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
			);

			CREATE TABLE IF NOT EXISTS locations(
				id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
				tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
				name TEXT NOT NULL,
				address TEXT,
				city TEXT,
				state TEXT,
				postal_code TEXT,
				country TEXT,
				phone TEXT,
				email TEXT,
				location_type TEXT NOT NULL DEFAULT 'WAREHOUSE',
				capacity NUMERIC(10,2),
				capacity_unit TEXT,
				manager_id UUID REFERENCES users(id),
				operating_hours TEXT,
				temperature_controlled BOOLEAN NOT NULL DEFAULT FALSE,
				security_level TEXT DEFAULT 'STANDARD',
				is_active BOOLEAN NOT NULL DEFAULT TRUE,
				notes TEXT,
				created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
				updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
				UNIQUE(tenant_id, name)
			);

			CREATE TABLE IF NOT EXISTS products (
				id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
				tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
				name TEXT NOT NULL,
				sku TEXT UNIQUE NOT NULL,
				description TEXT,
				category TEXT,
				unit TEXT NOT NULL DEFAULT 'pieces',
				min_stock_level NUMERIC(10,2) DEFAULT 0,
				max_stock_level NUMERIC(10,2),
				is_active BOOLEAN DEFAULT TRUE,
				created_at TIMESTAMPTZ DEFAULT NOW(),
				updated_at TIMESTAMPTZ DEFAULT NOW()
			);

			CREATE TABLE IF NOT EXISTS batches (
				id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
				tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
				product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
				batch_no TEXT NOT NULL,
				expiry_date DATE,
				manufacture_date DATE,
				supplier_id UUID,
				cost_price NUMERIC(10,2),
				selling_price NUMERIC(10,2),
				notes TEXT,
				created_at TIMESTAMPTZ DEFAULT NOW(),
				UNIQUE(tenant_id, batch_no)
			);

			CREATE TABLE IF NOT EXISTS inventory(
				id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
				tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
				product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
				batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
				location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
				quantity NUMERIC(10,2) NOT NULL CHECK (quantity > 0),
				reserved_quantity NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (reserved_quantity >= 0),
				available_quantity NUMERIC(10,2) GENERATED ALWAYS AS (quantity - reserved_quantity) STORED,
				min_stock_level NUMERIC(10,2) DEFAULT 0,
				max_stock_level NUMERIC(10,2),
				last_counted_at TIMESTAMPTZ,
				created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
				updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
				UNIQUE (tenant_id, product_id, batch_id, location_id)
			);
		`
		_, err = db.Exec(setupSQL)
		if err != nil {
			return fmt.Errorf("failed to create test tables: %w", err)
		}
	}
	return nil
}

// cleanupTestData removes all test data
func cleanupTestData(t *testing.T, db *sql.DB) {
	tables := []string{"inventory", "batches", "products", "locations", "users", "tenants"}
	for _, table := range tables {
		_, err := db.Exec(fmt.Sprintf("DELETE FROM %s", table))
		if err != nil {
			t.Logf("Warning: failed to cleanup table %s: %v", table, err)
		}
	}
}

// CreateTestTenant creates a test tenant
func CreateTestTenant(t *testing.T, testDB *TestDB, name string) TestTenant {
	tenantID := uuid.New()
	_, err := testDB.SQLDB.Exec(
		"INSERT INTO tenants (id, name, email, phone) VALUES ($1, $2, $3, $4)",
		tenantID, name, fmt.Sprintf("admin@%s.com", name), "+1234567890",
	)
	if err != nil {
		t.Fatalf("Failed to create test tenant: %v", err)
	}

	return TestTenant{
		ID:   tenantID,
		Name: name,
	}
}

// CreateTestUser creates a test user
func CreateTestUser(t *testing.T, testDB *TestDB, tenantID uuid.UUID, email, password, role string) TestUser {
	userID := uuid.New()
	_, err := testDB.SQLDB.Exec(
		"INSERT INTO users (id, tenant_id, name, email, password, phone, role) VALUES ($1, $2, $3, $4, $5, $6, $7)",
		userID, tenantID, "Test User", email, password, "+1234567890", role,
	)
	if err != nil {
		t.Fatalf("Failed to create test user: %v", err)
	}

	return TestUser{
		ID:       userID,
		Email:    email,
		Password: password,
		Role:     role,
		TenantID: tenantID,
	}
}

// CreateTestLocation creates a test location
func CreateTestLocation(t *testing.T, testDB *TestDB, tenantID uuid.UUID, name, locationType string) TestLocation {
	locationID := uuid.New()
	_, err := testDB.SQLDB.Exec(
		"INSERT INTO locations (id, tenant_id, name, location_type) VALUES ($1, $2, $3, $4)",
		locationID, tenantID, name, locationType,
	)
	if err != nil {
		t.Fatalf("Failed to create test location: %v", err)
	}

	return TestLocation{
		ID:           locationID,
		Name:         name,
		LocationType: locationType,
		TenantID:     tenantID,
	}
}

// CreateTestProduct creates a test product
func CreateTestProduct(t *testing.T, testDB *TestDB, tenantID uuid.UUID, name, sku string) TestProduct {
	productID := uuid.New()
	_, err := testDB.SQLDB.Exec(
		"INSERT INTO products (id, tenant_id, name, sku) VALUES ($1, $2, $3, $4)",
		productID, tenantID, name, sku,
	)
	if err != nil {
		t.Fatalf("Failed to create test product: %v", err)
	}

	return TestProduct{
		ID:       productID,
		Name:     name,
		SKU:      sku,
		TenantID: tenantID,
	}
}

// CreateTestBatch creates a test batch
func CreateTestBatch(t *testing.T, testDB *TestDB, tenantID, productID uuid.UUID, batchNo string) TestBatch {
	batchID := uuid.New()
	_, err := testDB.SQLDB.Exec(
		"INSERT INTO batches (id, tenant_id, product_id, batch_no) VALUES ($1, $2, $3, $4)",
		batchID, tenantID, productID, batchNo,
	)
	if err != nil {
		t.Fatalf("Failed to create test batch: %v", err)
	}

	return TestBatch{
		ID:        batchID,
		BatchNo:   batchNo,
		ProductID: productID,
		TenantID:  tenantID,
	}
}

// CreateTestInventory creates test inventory
func CreateTestInventory(t *testing.T, testDB *TestDB, tenantID, productID, batchID, locationID uuid.UUID, quantity float64) TestInventory {
	inventoryID := uuid.New()
	_, err := testDB.SQLDB.Exec(
		"INSERT INTO inventory (id, tenant_id, product_id, batch_id, location_id, quantity) VALUES ($1, $2, $3, $4, $5, $6)",
		inventoryID, tenantID, productID, batchID, locationID, quantity,
	)
	if err != nil {
		t.Fatalf("Failed to create test inventory: %v", err)
	}

	return TestInventory{
		ID:         inventoryID,
		ProductID:  productID,
		BatchID:    batchID,
		LocationID: locationID,
		Quantity:   quantity,
		TenantID:   tenantID,
	}
}

// GenerateUniqueEmail generates a unique email for testing
func GenerateUniqueEmail(prefix string) string {
	return fmt.Sprintf("%s_%d@example.com", prefix, time.Now().UnixNano())
}

// GenerateUniqueSKU generates a unique SKU for testing
func GenerateUniqueSKU(prefix string) string {
	return fmt.Sprintf("%s_%d", prefix, time.Now().UnixNano())
}