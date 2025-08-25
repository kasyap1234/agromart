package testutil

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"

	"agromart2/db"
	"agromart2/internal/database"
)

// TestDatabase provides utilities for managing test database
type TestDatabase struct {
	Pool    *pgxpool.Pool
	Queries *db.Queries
}

// NewTestDatabase creates a new test database connection
func NewTestDatabase() (*TestDatabase, error) {
	cfg := &database.Config{
		Host:              "localhost",
		Port:              5432,
		User:              "postgres",
		Password:          "password",
		Database:          "agromart_test",
		SSLMode:           "disable",
		MaxConns:          10,
		MinConns:          1,
		MaxConnLifetime:   5 * time.Minute,
		MaxConnIdleTime:   1 * time.Minute,
		HealthCheckPeriod: 30 * time.Second,
	}

	ctx := context.Background()
	pool, err := cfg.NewPool(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to create connection pool: %w", err)
	}

	wrapper := database.NewPgxWrapper(pool)
	queries := db.New(wrapper)

	return &TestDatabase{
		Pool:    pool,
		Queries: queries,
	}, nil
}

// Close closes the database connection
func (td *TestDatabase) Close() {
	if td.Pool != nil {
		td.Pool.Close()
	}
}

// TruncateAll truncates all test tables
func (td *TestDatabase) TruncateAll(ctx context.Context) error {
	tables := []string{
		"users",
		"tenants", 
		"products",
		"customers",
		"suppliers",
		"purchase_orders",
		"purchase_order_items",
		"sales_orders",
		"sales_order_items",
		"inventory",
		"inventory_logs",
		"batches",
		"files",
		"refresh_tokens",
	}

	for _, table := range tables {
		_, err := td.Pool.Exec(ctx, fmt.Sprintf("TRUNCATE TABLE %s CASCADE", table))
		if err != nil {
			return fmt.Errorf("failed to truncate table %s: %w", table, err)
		}
	}

	return nil
}

// TestUser represents a test user
type TestUser struct {
	ID       uuid.UUID
	Email    string
	Password string
	Name     string
	Role     string
	TenantID uuid.UUID
}

// TestTenant represents a test tenant
type TestTenant struct {
	ID    uuid.UUID
	Name  string
	Email string
}

// CreateTestTenant creates a test tenant
func (td *TestDatabase) CreateTestTenant(ctx context.Context, name, email string) (*TestTenant, error) {
	tenant, err := td.Queries.CreateTenant(ctx, db.CreateTenantParams{
		Name:  name,
		Email: email,
		Phone: "",
		Address: sql.NullString{},
		RegistrationNumber: sql.NullString{},
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create test tenant: %w", err)
	}

	return &TestTenant{
		ID:    tenant.ID,
		Name:  tenant.Name,
		Email: tenant.Email,
	}, nil
}

// CreateTestUser creates a test user
func (td *TestDatabase) CreateTestUser(ctx context.Context, email, password, name, role string, tenantID uuid.UUID) (*TestUser, error) {
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("failed to hash password: %w", err)
	}

	user, err := td.Queries.CreateUser(ctx, db.CreateUserParams{
		Name:     name,
		Email:    email,
		Password: string(hashedPassword),
		Phone:    "",
		TenantID: tenantID,
		Column6:  role, // The role is stored in Column6 based on the schema
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create test user: %w", err)
	}

	return &TestUser{
		ID:       user.ID,
		Email:    user.Email,
		Password: password, // Store original password for testing
		Name:     user.Name,
		Role:     role,
		TenantID: user.TenantID,
	}, nil
}

// CreateTestProduct creates a test product
func (td *TestDatabase) CreateTestProduct(ctx context.Context, name, sku string, price float64, tenantID uuid.UUID) (db.Product, error) {
	// We need a default unit ID - let's use a zero UUID for now
	defaultUnitID := uuid.UUID{}
	
	product, err := td.Queries.CreateProduct(ctx, db.CreateProductParams{
		TenantID:     tenantID,
		Sku:          sku,
		Name:         name,
		Price:        fmt.Sprintf("%.2f", price),
		Description:  sql.NullString{},
		ImageUrl:     sql.NullString{},
		Brand:        sql.NullString{},
		UnitID:       defaultUnitID,
		PricePerUnit: sql.NullString{},
		GstPercent:   sql.NullString{},
	})
	if err != nil {
		return db.Product{}, fmt.Errorf("failed to create test product: %w", err)
	}

	return product, nil
}

// CreateTestCustomer creates a test customer
func (td *TestDatabase) CreateTestCustomer(ctx context.Context, name, email, phone string, tenantID uuid.UUID) (db.Customer, error) {
	customer, err := td.Queries.CreateCustomer(ctx, db.CreateCustomerParams{
		TenantID:      tenantID,
		Name:          name,
		ContactPerson: sql.NullString{String: name, Valid: true},
		Email:         sql.NullString{String: email, Valid: true},
		Phone:         sql.NullString{String: phone, Valid: true},
		Address:       sql.NullString{},
		PaymentMode:   sql.NullString{},
	})
	if err != nil {
		return db.Customer{}, fmt.Errorf("failed to create test customer: %w", err)
	}

	return customer, nil
}

// SetupBasicTestData sets up basic test data (tenant + admin user)
func (td *TestDatabase) SetupBasicTestData(ctx context.Context) (*TestTenant, *TestUser, error) {
	// Clean existing data
	if err := td.TruncateAll(ctx); err != nil {
		return nil, nil, err
	}

	// Create test tenant
	tenant, err := td.CreateTestTenant(ctx, "Test Company", "test@company.com")
	if err != nil {
		return nil, nil, err
	}

	// Create test admin user
	user, err := td.CreateTestUser(ctx, "admin@test.com", "password123", "Test Admin", "admin", tenant.ID)
	if err != nil {
		return nil, nil, err
	}

	return tenant, user, nil
}