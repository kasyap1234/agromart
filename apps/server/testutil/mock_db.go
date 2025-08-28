package testutil

import (
	"context"
	"database/sql"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/mock"

	"agromart2/db"
)

// MockCustomerQuerier implements the CustomerQuerier interface for testing
type MockCustomerQuerier struct {
	mock.Mock
}

// Customer-related methods
func (m *MockCustomerQuerier) CreateCustomer(ctx context.Context, arg db.CreateCustomerParams) (db.Customer, error) {
	args := m.Called(ctx, arg)
	return args.Get(0).(db.Customer), args.Error(1)
}

func (m *MockCustomerQuerier) GetCustomerByID(ctx context.Context, arg db.GetCustomerByIDParams) (db.Customer, error) {
	args := m.Called(ctx, arg)
	return args.Get(0).(db.Customer), args.Error(1)
}

func (m *MockCustomerQuerier) ListCustomers(ctx context.Context, arg db.ListCustomersParams) ([]db.Customer, error) {
	args := m.Called(ctx, arg)
	return args.Get(0).([]db.Customer), args.Error(1)
}

func (m *MockCustomerQuerier) ListActiveCustomers(ctx context.Context, arg db.ListActiveCustomersParams) ([]db.Customer, error) {
	args := m.Called(ctx, arg)
	return args.Get(0).([]db.Customer), args.Error(1)
}

func (m *MockCustomerQuerier) UpdateCustomer(ctx context.Context, arg db.UpdateCustomerParams) (db.Customer, error) {
	args := m.Called(ctx, arg)
	return args.Get(0).(db.Customer), args.Error(1)
}

func (m *MockCustomerQuerier) DeactivateCustomer(ctx context.Context, arg db.DeactivateCustomerParams) error {
	args := m.Called(ctx, arg)
	return args.Error(0)
}

func (m *MockCustomerQuerier) SearchCustomers(ctx context.Context, arg db.SearchCustomersParams) ([]db.Customer, error) {
	args := m.Called(ctx, arg)
	return args.Get(0).([]db.Customer), args.Error(1)
}

func (m *MockCustomerQuerier) CountCustomers(ctx context.Context, tenantID uuid.UUID) (int64, error) {
	args := m.Called(ctx, tenantID)
	return args.Get(0).(int64), args.Error(1)
}

func (m *MockCustomerQuerier) CheckCustomerExists(ctx context.Context, arg db.CheckCustomerExistsParams) (bool, error) {
	args := m.Called(ctx, arg)
	return args.Bool(0), args.Error(1)
}

// MockProductQuerier implements the ProductQuerier interface for testing
type MockProductQuerier struct {
	mock.Mock
}

// Product-related methods (only the ones that exist in db package)
func (m *MockProductQuerier) CreateProduct(ctx context.Context, arg db.CreateProductParams) (db.Product, error) {
	args := m.Called(ctx, arg)
	return args.Get(0).(db.Product), args.Error(1)
}

func (m *MockProductQuerier) GetProductByID(ctx context.Context, arg db.GetProductByIDParams) (db.Product, error) {
	args := m.Called(ctx, arg)
	return args.Get(0).(db.Product), args.Error(1)
}

func (m *MockProductQuerier) ListProducts(ctx context.Context, arg db.ListProductsParams) ([]db.Product, error) {
	args := m.Called(ctx, arg)
	return args.Get(0).([]db.Product), args.Error(1)
}

func (m *MockProductQuerier) SearchProducts(ctx context.Context, arg db.SearchProductsParams) ([]db.Product, error) {
	args := m.Called(ctx, arg)
	return args.Get(0).([]db.Product), args.Error(1)
}

func (m *MockProductQuerier) CountProducts(ctx context.Context, tenantID uuid.UUID) (int64, error) {
	args := m.Called(ctx, tenantID)
	return args.Get(0).(int64), args.Error(1)
}

func (m *MockProductQuerier) CheckProductExists(ctx context.Context, arg db.CheckProductExistsParams) (bool, error) {
	args := m.Called(ctx, arg)
	return args.Bool(0), args.Error(1)
}

// Test data generators
func NewMockCustomer(id, tenantID uuid.UUID, name, email string) db.Customer {
	return db.Customer{
		ID:       id,
		TenantID: tenantID,
		Name:     name,
		ContactPerson: sql.NullString{String: "John Doe", Valid: true},
		Email:    sql.NullString{String: email, Valid: true},
		Phone:    sql.NullString{String: "+1234567890", Valid: true},
		Address:  sql.NullString{String: "123 Main St", Valid: true},
		PaymentMode: sql.NullString{String: "NET30", Valid: true},
		IsActive: sql.NullBool{Bool: true, Valid: true},
		CreatedAt: time.Now(),
	}
}

func NewMockProduct(id, tenantID uuid.UUID, name, sku string) db.Product {
	return db.Product{
		ID:       id,
		TenantID: tenantID,
		Name:     name,
		Sku:      sku,
		Price:    "100.00",
		CreatedAt: time.Now(),
	}
}

// TestSetup provides common test setup utilities
type TestSetup struct {
	T *testing.T
	MockCustomerQuerier *MockCustomerQuerier
	MockProductQuerier  *MockProductQuerier
	TenantID uuid.UUID
	UserID uuid.UUID
}

func NewTestSetup(t *testing.T) *TestSetup {
	return &TestSetup{
		T: t,
		MockCustomerQuerier: &MockCustomerQuerier{},
		MockProductQuerier:  &MockProductQuerier{},
		TenantID: uuid.New(),
		UserID: uuid.New(),
	}
}

// AssertExpectations verifies all mock expectations were met
func (ts *TestSetup) AssertExpectations() {
	ts.MockCustomerQuerier.AssertExpectations(ts.T)
	ts.MockProductQuerier.AssertExpectations(ts.T)
}

// Cleanup performs any necessary cleanup
func (ts *TestSetup) Cleanup() {
	// Add any cleanup logic here
}