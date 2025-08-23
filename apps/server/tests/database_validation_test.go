package tests

import (
	"context"
	"database/sql"
	"fmt"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"agromart2/apps/server/config"
	"agromart2/internal/database"
	"agromart2/db"
)

// DatabaseValidator provides comprehensive database validation
type DatabaseValidator struct {
	pool   *pgxpool.Pool
	queries *db.Queries
}

// NewDatabaseValidator creates a new database validator
func NewDatabaseValidator(pool *pgxpool.Pool) *DatabaseValidator {
	wrapper := database.NewPgxWrapper(pool)
	queries := db.New(wrapper)
	return &DatabaseValidator{
		pool:    pool,
		queries: queries,
	}
}

// TestDatabaseConnection tests basic database connectivity
func (dv *DatabaseValidator) TestDatabaseConnection(t *testing.T) {
	ctx := context.Background()

	// Test basic ping
	err := dv.pool.Ping(ctx)
	assert.NoError(t, err, "Database connection should be healthy")

	// Test connection pool stats
	stats := dv.pool.Stat()
	assert.Greater(t, stats.TotalConns(), int32(0), "Should have active connections")
}

// TestMigrationStatus verifies all migrations are applied
func (dv *DatabaseValidator) TestMigrationStatus(t *testing.T) {
	ctx := context.Background()

	// Check schema_migrations table exists
	var exists bool
	err := dv.pool.QueryRow(ctx, `
		SELECT EXISTS (
			SELECT 1 FROM information_schema.tables
			WHERE table_name = 'schema_migrations'
		)`).Scan(&exists)
	require.NoError(t, err)
	assert.True(t, exists, "schema_migrations table should exist")

	// Check all 14 migrations are applied
	var count int
	err = dv.pool.QueryRow(ctx, "SELECT COUNT(*) FROM schema_migrations").Scan(&count)
	require.NoError(t, err)
	assert.Equal(t, 14, count, "All 14 migrations should be applied")

	// List applied migrations for verification
	rows, err := dv.pool.Query(ctx, "SELECT version FROM schema_migrations ORDER BY version")
	require.NoError(t, err)
	defer rows.Close()

	var appliedVersions []string
	for rows.Next() {
		var version string
		err := rows.Scan(&version)
		require.NoError(t, err)
		appliedVersions = append(appliedVersions, version)
	}

	expectedVersions := []string{
		"000001_create_tenant_tables",
		"000002_create_users_table",
		"000003_create_units_table",
		"000004_create_products_table",
		"000005_create_batches_table",
		"000006_create_inventory_table",
		"000007_create_suppliers_tables",
		"000008_create_customers_tables",
		"000009_create_locations_table",
		"000010_create_purchase_orders_table",
		"000011_create_sales_orders",
		"000012_create_inventory_log",
		"000013_create_settings_tables",
		"000014_create_files_table",
	}

	assert.Equal(t, expectedVersions, appliedVersions, "Migration versions should match expected list")
}

// TestSchemaValidation verifies all required tables exist
func (dv *DatabaseValidator) TestSchemaValidation(t *testing.T) {
	ctx := context.Background()

	requiredTables := []string{
		"tenants",
		"users",
		"units",
		"products",
		"batches",
		"inventory",
		"suppliers",
		"customers",
		"locations",
		"purchase_orders",
		"purchase_order_items",
		"sales_orders",
		"sales_order_items",
		"inventory_log",
		"settings",
		"files",
		"schema_migrations",
	}

	for _, table := range requiredTables {
		var exists bool
		query := fmt.Sprintf(`
			SELECT EXISTS (
				SELECT 1 FROM information_schema.tables
				WHERE table_name = '%s'
			)`, table)
		err := dv.pool.QueryRow(ctx, query).Scan(&exists)
		require.NoError(t, err, "Should be able to check table existence")
		assert.True(t, exists, "Table %s should exist", table)
	}
}

// TestForeignKeyConstraints verifies all foreign key relationships
func (dv *DatabaseValidator) TestForeignKeyConstraints(t *testing.T) {
	ctx := context.Background()

	// Check foreign key constraints exist
	foreignKeyChecks := []struct {
		table       string
		constraint  string
		description string
	}{
		{"users", "fk_users_tenant_id", "Users should reference tenants"},
		{"products", "fk_products_tenant_id", "Products should reference tenants"},
		{"inventory", "fk_inventory_product_id", "Inventory should reference products"},
		{"inventory", "fk_inventory_location_id", "Inventory should reference locations"},
		{"batches", "fk_batches_product_id", "Batches should reference products"},
		{"purchase_orders", "fk_purchase_orders_supplier_id", "Purchase orders should reference suppliers"},
		{"purchase_order_items", "fk_purchase_order_items_purchase_order_id", "Purchase order items should reference purchase orders"},
		{"sales_orders", "fk_sales_orders_customer_id", "Sales orders should reference customers"},
		{"sales_order_items", "fk_sales_order_items_sales_order_id", "Sales order items should reference sales orders"},
	}

	for _, check := range foreignKeyChecks {
		var exists bool
		query := `
			SELECT EXISTS (
				SELECT 1 FROM information_schema.table_constraints tc
				JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
				WHERE tc.table_name = $1
				AND tc.constraint_name = $2
				AND tc.constraint_type = 'FOREIGN KEY'
			)`
		err := dv.pool.QueryRow(ctx, query, check.table, check.constraint).Scan(&exists)
		require.NoError(t, err)
		assert.True(t, exists, check.description)
	}
}

// TestIndexPerformance checks that proper indexes are in place
func (dv *DatabaseValidator) TestIndexPerformance(t *testing.T) {
	ctx := context.Background()

	requiredIndexes := []struct {
		table      string
		index      string
		description string
	}{
		{"users", "idx_users_email", "Users email should be indexed"},
		{"users", "idx_users_tenant_id", "Users tenant_id should be indexed"},
		{"products", "idx_products_tenant_id", "Products tenant_id should be indexed"},
		{"products", "idx_products_name", "Products name should be indexed"},
		{"inventory", "idx_inventory_product_id", "Inventory product_id should be indexed"},
		{"inventory", "idx_inventory_location_id", "Inventory location_id should be indexed"},
		{"batches", "idx_batches_product_id", "Batches product_id should be indexed"},
		{"batches", "idx_batches_expiry_date", "Batches expiry_date should be indexed"},
		{"purchase_orders", "idx_purchase_orders_tenant_id", "Purchase orders tenant_id should be indexed"},
		{"sales_orders", "idx_sales_orders_tenant_id", "Sales orders tenant_id should be indexed"},
	}

	for _, idx := range requiredIndexes {
		var exists bool
		query := `
			SELECT EXISTS (
				SELECT 1 FROM pg_indexes
				WHERE tablename = $1 AND indexname = $2
			)`
		err := dv.pool.QueryRow(ctx, query, idx.table, idx.index).Scan(&exists)
		require.NoError(t, err)
		assert.True(t, exists, idx.description)
	}
}

// TestTransactionHandling verifies ACID properties
func (dv *DatabaseValidator) TestTransactionHandling(t *testing.T) {
	ctx := context.Background()

	// Test transaction rollback
	tx, err := dv.pool.Begin(ctx)
	require.NoError(t, err)

	// Create a test tenant
	testTenantID := "550e8400-e29b-41d4-a716-446655440000"
	_, err = tx.Exec(ctx, `
		INSERT INTO tenants (id, name, email, phone, address, registration_number)
		VALUES ($1, $2, $3, $4, $5, $6)`,
		testTenantID, "Test Tenant", "test@example.com", "+1234567890",
		sql.NullString{String: "Test Address", Valid: true},
		sql.NullString{String: "TEST123", Valid: true})
	require.NoError(t, err)

	// Rollback should undo the insert
	err = tx.Rollback(ctx)
	require.NoError(t, err)

	// Verify the tenant was not created
	var exists bool
	err = dv.pool.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM tenants WHERE id = $1)", testTenantID).Scan(&exists)
	require.NoError(t, err)
	assert.False(t, exists, "Transaction rollback should have prevented tenant creation")
}

// TestConnectionPooling tests connection pool management
func (dv *DatabaseValidator) TestConnectionPooling(t *testing.T) {
	ctx := context.Background()

	// Test multiple concurrent connections
	stats := dv.pool.Stat()
	initialConns := stats.TotalConns()

	// Run multiple queries concurrently
	queries := make(chan error, 10)
	for i := 0; i < 10; i++ {
		go func() {
			_, err := dv.pool.Exec(ctx, "SELECT 1")
			queries <- err
		}()
	}

	// Wait for all queries to complete
	for i := 0; i < 10; i++ {
		err := <-queries
		assert.NoError(t, err, "Concurrent query should succeed")
	}

	// Check pool stats after concurrent queries
	finalStats := dv.pool.Stat()
	assert.GreaterOrEqual(t, finalStats.TotalConns(), initialConns, "Connection pool should handle concurrent load")
}

// TestMultiTenantIsolation verifies tenant data isolation
func (dv *DatabaseValidator) TestMultiTenantIsolation(t *testing.T) {
	ctx := context.Background()

	// This would require setting up test tenants and verifying isolation
	// For now, we'll test that tenant_id columns exist and are properly constrained
	tenantTables := []string{"users", "products", "inventory", "suppliers", "customers"}

	for _, table := range tenantTables {
		var hasTenantID bool
		query := fmt.Sprintf(`
			SELECT EXISTS (
				SELECT 1 FROM information_schema.columns
				WHERE table_name = '%s' AND column_name = 'tenant_id'
			)`, table)
		err := dv.pool.QueryRow(ctx, query).Scan(&hasTenantID)
		require.NoError(t, err)
		assert.True(t, hasTenantID, "Table %s should have tenant_id column", table)
	}
}

// Comprehensive database validation test
func TestDatabaseValidation(t *testing.T) {
	// Load configuration
	cfg, err := config.LoadConfig()
	require.NoError(t, err)

	// Create database config
	dbConfig := &database.Config{
		Host:              cfg.DB_Host,
		Port:              cfg.DB_Port,
		User:              cfg.DB_User,
		Password:          cfg.DB_Password,
		Database:          cfg.DB_Name,
		SSLMode:           "disable",
		MaxConns:          10,
		MinConns:          1,
		MaxConnLifetime:   5 * time.Minute,
		MaxConnIdleTime:   1 * time.Minute,
		HealthCheckPeriod: 30 * time.Second,
	}

	// Validate config
	err = dbConfig.Validate()
	require.NoError(t, err)

	// Create connection pool
	ctx := context.Background()
	pool, err := dbConfig.NewPool(ctx)
	require.NoError(t, err)
	defer pool.Close()

	// Test connection
	err = pool.Ping(ctx)
	require.NoError(t, err)

	// Create validator
	validator := NewDatabaseValidator(pool)

	// Run all validation tests
	t.Run("DatabaseConnection", validator.TestDatabaseConnection)
	t.Run("MigrationStatus", validator.TestMigrationStatus)
	t.Run("SchemaValidation", validator.TestSchemaValidation)
	t.Run("ForeignKeyConstraints", validator.TestForeignKeyConstraints)
	t.Run("IndexPerformance", validator.TestIndexPerformance)
	t.Run("TransactionHandling", validator.TestTransactionHandling)
	t.Run("ConnectionPooling", validator.TestConnectionPooling)
	t.Run("MultiTenantIsolation", validator.TestMultiTenantIsolation)
}