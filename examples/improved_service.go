package examples

import (
	"context"
	"encoding/json"

	"github.com/google/uuid"
	"github.com/kasyap1234/agromart/db"
)

// BEFORE: Your service was tightly coupled to the concrete implementation
type OldProductService struct {
	queries *db.Queries // Concrete type - hard to mock!
}

// AFTER: Your service can now use the interface for better testability
type ProductService struct {
	queries db.Querier // Interface - easy to mock!
}

// NewProductService now accepts any implementation of the Querier interface
func NewProductService(q db.Querier) *ProductService {
	return &ProductService{queries: q}
}

// Example showing the power of JSON tags - can directly return as JSON
func (s *ProductService) GetProductAsJSON(ctx context.Context, id, tenantID uuid.UUID) ([]byte, error) {
	product, err := s.queries.GetProductByID(ctx, db.GetProductByIDParams{
		ID:       id,
		TenantID: tenantID,
	})
	if err != nil {
		return nil, err
	}

	// No need to create separate response structs - JSON tags are built-in!
	return json.Marshal(product)
}

// Example showing empty slices feature
func (s *ProductService) ListProductsSafe(ctx context.Context, tenantID uuid.UUID) ([]db.Product, error) {
	products, err := s.queries.ListProducts(ctx, db.ListProductsParams{
		TenantID: tenantID,
		Limit:    10,
		Offset:   0,
	})
	if err != nil {
		return nil, err
	}
	
	// products is always []db.Product{} never nil, so safe to return directly
	// No need for: if products == nil { return []db.Product{}, nil }
	return products, nil
}

// BONUS: Mock for testing (you would generate this or use a mocking library)
type MockQuerier struct {
	products []db.Product
}

func (m *MockQuerier) GetProductByID(ctx context.Context, arg db.GetProductByIDParams) (db.Product, error) {
	// Mock implementation
	return db.Product{
		ID:       arg.ID,
		TenantID: arg.TenantID,
		Name:     "Mocked Product",
		// JSON tags make this ready for API responses!
	}, nil
}

func (m *MockQuerier) ListProducts(ctx context.Context, arg db.ListProductsParams) ([]db.Product, error) {
	return m.products, nil // Always returns slice, never nil thanks to emit_empty_slices
}

// Implement other interface methods...
// (In real code, you'd use a mocking library like testify/mock or gomock)

// Example test showing how easy mocking becomes
func ExampleTest() {
	mock := &MockQuerier{
		products: []db.Product{
			{ID: uuid.New(), Name: "Test Product 1"},
			{ID: uuid.New(), Name: "Test Product 2"},
		},
	}
	
	service := NewProductService(mock) // Uses interface!
	ctx := context.Background()
	
	products, _ := service.ListProductsSafe(ctx, uuid.New())
	// products will always be a valid slice, never nil
	// Each product has JSON tags ready for API responses
	
	jsonData, _ := json.Marshal(products)
	// Direct JSON marshaling works perfectly due to JSON tags
	_ = jsonData
}
