package products

import (
	"context"
	"database/sql"
	"fmt"
	"testing"

	"agromart2/db"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// MockQueries implements the QueriesInterface for testing
type MockQueries struct {
	mock.Mock
}

func (m *MockQueries) CheckProductExists(ctx context.Context, params db.CheckProductExistsParams) (bool, error) {
	args := m.Called(ctx, params)
	return args.Bool(0), args.Error(1)
}

func (m *MockQueries) CountProducts(ctx context.Context, tenantID uuid.UUID) (int64, error) {
	args := m.Called(ctx, tenantID)
	return args.Get(0).(int64), args.Error(1)
}

func (m *MockQueries) CreateProduct(ctx context.Context, params db.CreateProductParams) (db.Product, error) {
	args := m.Called(ctx, params)
	if args.Get(0) == nil {
		return db.Product{}, args.Error(1)
	}
	return args.Get(0).(db.Product), args.Error(1)
}

func (m *MockQueries) CreateUnit(ctx context.Context, params db.CreateUnitParams) (db.Unit, error) {
	args := m.Called(ctx, params)
	if args.Get(0) == nil {
		return db.Unit{}, args.Error(1)
	}
	return args.Get(0).(db.Unit), args.Error(1)
}

func (m *MockQueries) GetProductByID(ctx context.Context, params db.GetProductByIDParams) (db.Product, error) {
	args := m.Called(ctx, params)
	if args.Get(0) == nil {
		return db.Product{}, args.Error(1)
	}
	return args.Get(0).(db.Product), args.Error(1)
}

func (m *MockQueries) GetProductBySKU(ctx context.Context, params db.GetProductBySKUParams) (db.Product, error) {
	args := m.Called(ctx, params)
	if args.Get(0) == nil {
		return db.Product{}, args.Error(1)
	}
	return args.Get(0).(db.Product), args.Error(1)
}

func (m *MockQueries) GetUnitByID(ctx context.Context, params db.GetUnitByIDParams) (db.Unit, error) {
	args := m.Called(ctx, params)
	if args.Get(0) == nil {
		return db.Unit{}, args.Error(1)
	}
	return args.Get(0).(db.Unit), args.Error(1)
}

func (m *MockQueries) ListProducts(ctx context.Context, params db.ListProductsParams) ([]db.Product, error) {
	args := m.Called(ctx, params)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]db.Product), args.Error(1)
}

func (m *MockQueries) ListUnits(ctx context.Context, params db.ListUnitsParams) ([]db.Unit, error) {
	args := m.Called(ctx, params)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]db.Unit), args.Error(1)
}

func (m *MockQueries) SearchProducts(ctx context.Context, params db.SearchProductsParams) ([]db.Product, error) {
	args := m.Called(ctx, params)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]db.Product), args.Error(1)
}

func (m *MockQueries) UpdateProductPatch(ctx context.Context, params db.UpdateProductPatchParams) error {
	args := m.Called(ctx, params)
	return args.Error(0)
}

func (m *MockQueries) DeleteProduct(ctx context.Context, params db.DeleteProductParams) error {
	args := m.Called(ctx, params)
	return args.Error(0)
}

func setupTestService() (*ProductService, *MockQueries) {
	mockQueries := new(MockQueries)
	// Create a service with mock queries using interface
	service := &ProductService{
		db: nil,
		q:  mockQueries,
	}
	return service, mockQueries
}

func TestProductService_CreateProduct(t *testing.T) {
	service, mockQueries := setupTestService()
	ctx := context.Background()
	
	t.Run("successful creation", func(t *testing.T) {
		tenantID := uuid.New()
		unitID := uuid.New()
		
		params := CreateProductParams{
			TenantID:     tenantID,
			SKU:          "TEST-001",
			Name:         "Test Product",
			Price:        1000,
			Description:  "Test description",
			ImageURL:     "http://example.com/image.jpg",
			Brand:        "Test Brand",
			UnitID:       unitID,
			PricePerUnit: 100,
			GSTPercent:   18,
		}
		
		expectedProduct := db.Product{
			ID:       uuid.New(),
			TenantID: tenantID,
			Sku:      params.SKU,
			Name:     params.Name,
			Price:    "1000",
		}
		
		expectedDBParams := db.CreateProductParams{
			TenantID:     tenantID,
			Sku:          "TEST-001",
			Name:         "Test Product",
			Price:        "1000",
			Description:  sql.NullString{String: "Test description", Valid: true},
			ImageUrl:     sql.NullString{String: "http://example.com/image.jpg", Valid: true},
			Brand:        sql.NullString{String: "Test Brand", Valid: true},
			UnitID:       unitID,
			PricePerUnit: sql.NullString{String: "100", Valid: true},
			GstPercent:   sql.NullString{String: "18", Valid: true},
		}
		
		mockQueries.On("CreateProduct", ctx, expectedDBParams).Return(expectedProduct, nil)
		
		result, err := service.CreateProduct(ctx, params)
		
		assert.NoError(t, err)
		assert.Equal(t, expectedProduct, result)
		mockQueries.AssertExpectations(t)
	})
	
	t.Run("database error", func(t *testing.T) {
		tenantID := uuid.New()
		
		params := CreateProductParams{
			TenantID: tenantID,
			SKU:      "TEST-001",
			Name:     "Test Product",
			Price:    1000,
		}
		
		mockQueries.On("CreateProduct", ctx, mock.AnythingOfType("db.CreateProductParams")).
			Return(db.Product{}, fmt.Errorf("database error"))
		
		result, err := service.CreateProduct(ctx, params)
		
		assert.Error(t, err)
		assert.Equal(t, db.Product{}, result)
		assert.Contains(t, err.Error(), "database error")
		mockQueries.AssertExpectations(t)
	})
	
	t.Run("handles empty optional fields", func(t *testing.T) {
		tenantID := uuid.New()
		unitID := uuid.New()
		
		params := CreateProductParams{
			TenantID: tenantID,
			SKU:      "TEST-001",
			Name:     "Test Product",
			Price:    1000,
			UnitID:   unitID,
			// Empty optional fields
			Description:  "",
			ImageURL:     "",
			Brand:        "",
			PricePerUnit: 0,
			GSTPercent:   0,
		}
		
		expectedDBParams := db.CreateProductParams{
			TenantID:     tenantID,
			Sku:          "TEST-001",
			Name:         "Test Product",
			Price:        "1000",
			Description:  sql.NullString{String: "", Valid: false},
			ImageUrl:     sql.NullString{String: "", Valid: false},
			Brand:        sql.NullString{String: "", Valid: false},
			UnitID:       unitID,
			PricePerUnit: sql.NullString{String: "0", Valid: true},
			GstPercent:   sql.NullString{String: "0", Valid: true},
		}
		
		expectedProduct := db.Product{
			ID:       uuid.New(),
			TenantID: tenantID,
			Sku:      params.SKU,
			Name:     params.Name,
		}
		
		mockQueries.On("CreateProduct", ctx, expectedDBParams).Return(expectedProduct, nil)
		
		result, err := service.CreateProduct(ctx, params)
		
		assert.NoError(t, err)
		assert.Equal(t, expectedProduct, result)
		mockQueries.AssertExpectations(t)
	})
}

func TestProductService_GetProductByID(t *testing.T) {
	service, mockQueries := setupTestService()
	ctx := context.Background()
	
	t.Run("successful get", func(t *testing.T) {
		productID := uuid.New()
		tenantID := uuid.New()
		
		expectedProduct := db.Product{
			ID:       productID,
			TenantID: tenantID,
			Sku:      "TEST-001",
			Name:     "Test Product",
		}
		
		expectedParams := db.GetProductByIDParams{
			ID:       productID,
			TenantID: tenantID,
		}
		
		mockQueries.On("GetProductByID", ctx, expectedParams).Return(expectedProduct, nil)
		
		result, err := service.GetProductByID(ctx, productID, tenantID)
		
		assert.NoError(t, err)
		assert.Equal(t, expectedProduct, result)
		mockQueries.AssertExpectations(t)
	})
	
	t.Run("product not found", func(t *testing.T) {
		productID := uuid.New()
		tenantID := uuid.New()
		
		expectedParams := db.GetProductByIDParams{
			ID:       productID,
			TenantID: tenantID,
		}
		
		mockQueries.On("GetProductByID", ctx, expectedParams).
			Return(db.Product{}, sql.ErrNoRows)
		
		result, err := service.GetProductByID(ctx, productID, tenantID)
		
		assert.Error(t, err)
		assert.Equal(t, db.Product{}, result)
		assert.Equal(t, sql.ErrNoRows, err)
		mockQueries.AssertExpectations(t)
	})
}

func TestProductService_ListProducts(t *testing.T) {
	service, mockQueries := setupTestService()
	ctx := context.Background()
	
	t.Run("successful list", func(t *testing.T) {
		tenantID := uuid.New()
		limit := 20
		offset := 0
		
		expectedProducts := []db.Product{
			{ID: uuid.New(), TenantID: tenantID, Sku: "TEST-001", Name: "Product 1"},
			{ID: uuid.New(), TenantID: tenantID, Sku: "TEST-002", Name: "Product 2"},
		}
		
		expectedParams := db.ListProductsParams{
			TenantID: tenantID,
			Limit:    int32(limit),
			Offset:   int32(offset),
		}
		
		mockQueries.On("ListProducts", ctx, expectedParams).Return(expectedProducts, nil)
		
		result, err := service.ListProducts(ctx, tenantID, limit, offset)
		
		assert.NoError(t, err)
		assert.Equal(t, expectedProducts, result)
		assert.Len(t, result, 2)
		mockQueries.AssertExpectations(t)
	})
	
	t.Run("empty list", func(t *testing.T) {
		tenantID := uuid.New()
		limit := 20
		offset := 0
		
		expectedParams := db.ListProductsParams{
			TenantID: tenantID,
			Limit:    int32(limit),
			Offset:   int32(offset),
		}
		
		mockQueries.On("ListProducts", ctx, expectedParams).Return([]db.Product{}, nil)
		
		result, err := service.ListProducts(ctx, tenantID, limit, offset)
		
		assert.NoError(t, err)
		assert.Empty(t, result)
		mockQueries.AssertExpectations(t)
	})
}

func TestProductService_SearchProducts(t *testing.T) {
	service, mockQueries := setupTestService()
	ctx := context.Background()
	
	t.Run("successful search", func(t *testing.T) {
		tenantID := uuid.New()
		query := "test"
		limit := 20
		offset := 0
		
		expectedProducts := []db.Product{
			{ID: uuid.New(), TenantID: tenantID, Sku: "TEST-001", Name: "Test Product"},
		}
		
		expectedParams := db.SearchProductsParams{
			TenantID: tenantID,
			Name:     query,
			Limit:    int32(limit),
			Offset:   int32(offset),
		}
		
		mockQueries.On("SearchProducts", ctx, expectedParams).Return(expectedProducts, nil)
		
		result, err := service.SearchProducts(ctx, tenantID, query, limit, offset)
		
		assert.NoError(t, err)
		assert.Equal(t, expectedProducts, result)
		assert.Len(t, result, 1)
		mockQueries.AssertExpectations(t)
	})
}

func TestProductService_CountProducts(t *testing.T) {
	service, mockQueries := setupTestService()
	ctx := context.Background()
	
	t.Run("successful count", func(t *testing.T) {
		tenantID := uuid.New()
		expectedCount := int64(42)
		
		mockQueries.On("CountProducts", ctx, tenantID).Return(expectedCount, nil)
		
		result, err := service.CountProducts(ctx, tenantID)
		
		assert.NoError(t, err)
		assert.Equal(t, expectedCount, result)
		mockQueries.AssertExpectations(t)
	})
	
	t.Run("database error", func(t *testing.T) {
		tenantID := uuid.New()
		
		mockQueries.On("CountProducts", ctx, tenantID).Return(int64(0), fmt.Errorf("database error"))
		
		result, err := service.CountProducts(ctx, tenantID)
		
		assert.Error(t, err)
		assert.Equal(t, int64(0), result)
		mockQueries.AssertExpectations(t)
	})
}

func TestProductService_PatchProduct(t *testing.T) {
	service, mockQueries := setupTestService()
	ctx := context.Background()
	
	t.Run("successful patch", func(t *testing.T) {
		tenantID := uuid.New()
		productID := uuid.New()
		
		patch := ProductInputRequest{
			Name:  stringPtr("Updated Product"),
			Price: intPtr(1500),
		}
		
		expectedParams := db.UpdateProductPatchParams{
			ID:           productID,
			TenantID:     tenantID,
			Name:         sql.NullString{String: "Updated Product", Valid: true},
			Price:        sql.NullString{String: "1500", Valid: true},
			Description:  sql.NullString{Valid: false},
			ImageUrl:     sql.NullString{Valid: false},
			Brand:        sql.NullString{Valid: false},
			PricePerUnit: sql.NullString{Valid: false},
			GstPercent:   sql.NullString{Valid: false},
			UnitID:       uuid.NullUUID{Valid: false},
		}
		
		mockQueries.On("UpdateProductPatch", ctx, expectedParams).Return(nil)
		
		err := service.PatchProduct(ctx, tenantID, productID, patch)
		
		assert.NoError(t, err)
		mockQueries.AssertExpectations(t)
	})
	
	t.Run("partial patch", func(t *testing.T) {
		tenantID := uuid.New()
		productID := uuid.New()
		
		patch := ProductInputRequest{
			Name: stringPtr("Updated Name Only"),
		}
		
		expectedParams := db.UpdateProductPatchParams{
			ID:           productID,
			TenantID:     tenantID,
			Name:         sql.NullString{String: "Updated Name Only", Valid: true},
			Price:        sql.NullString{Valid: false},
			Description:  sql.NullString{Valid: false},
			ImageUrl:     sql.NullString{Valid: false},
			Brand:        sql.NullString{Valid: false},
			PricePerUnit: sql.NullString{Valid: false},
			GstPercent:   sql.NullString{Valid: false},
			UnitID:       uuid.NullUUID{Valid: false},
		}
		
		mockQueries.On("UpdateProductPatch", ctx, expectedParams).Return(nil)
		
		err := service.PatchProduct(ctx, tenantID, productID, patch)
		
		assert.NoError(t, err)
		mockQueries.AssertExpectations(t)
	})
}

func TestProductService_DeleteProduct(t *testing.T) {
	service, mockQueries := setupTestService()
	ctx := context.Background()
	
	t.Run("successful delete", func(t *testing.T) {
		tenantID := uuid.New()
		productID := uuid.New()
		
		// Mock product exists check
		mockQueries.On("CheckProductExists", ctx, db.CheckProductExistsParams{
			ID:       productID,
			TenantID: tenantID,
		}).Return(true, nil)
		
		// Mock delete operation
		mockQueries.On("DeleteProduct", ctx, db.DeleteProductParams{
			ID:       productID,
			TenantID: tenantID,
		}).Return(nil)
		
		err := service.DeleteProduct(ctx, productID, tenantID)
		
		assert.NoError(t, err)
		mockQueries.AssertExpectations(t)
	})
	
	t.Run("product not found", func(t *testing.T) {
		tenantID := uuid.New()
		productID := uuid.New()
		
		// Mock product exists check - returns false
		mockQueries.On("CheckProductExists", ctx, db.CheckProductExistsParams{
			ID:       productID,
			TenantID: tenantID,
		}).Return(false, nil)
		
		err := service.DeleteProduct(ctx, productID, tenantID)
		
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "product not found")
		mockQueries.AssertExpectations(t)
	})
	
	t.Run("check existence error", func(t *testing.T) {
		tenantID := uuid.New()
		productID := uuid.New()
		
		// Mock product exists check - returns error
		mockQueries.On("CheckProductExists", ctx, db.CheckProductExistsParams{
			ID:       productID,
			TenantID: tenantID,
		}).Return(false, fmt.Errorf("database error"))
		
		err := service.DeleteProduct(ctx, productID, tenantID)
		
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "failed to check product existence")
		mockQueries.AssertExpectations(t)
	})
}

func TestProductService_CheckProductExists(t *testing.T) {
	service, mockQueries := setupTestService()
	ctx := context.Background()
	
	t.Run("product exists", func(t *testing.T) {
		tenantID := uuid.New()
		productID := uuid.New()
		
		expectedParams := db.CheckProductExistsParams{
			ID:       productID,
			TenantID: tenantID,
		}
		
		mockQueries.On("CheckProductExists", ctx, expectedParams).Return(true, nil)
		
		result, err := service.CheckProductExists(ctx, productID, tenantID)
		
		assert.NoError(t, err)
		assert.True(t, result)
		mockQueries.AssertExpectations(t)
	})
	
	t.Run("product does not exist", func(t *testing.T) {
		tenantID := uuid.New()
		productID := uuid.New()
		
		expectedParams := db.CheckProductExistsParams{
			ID:       productID,
			TenantID: tenantID,
		}
		
		mockQueries.On("CheckProductExists", ctx, expectedParams).Return(false, nil)
		
		result, err := service.CheckProductExists(ctx, productID, tenantID)
		
		assert.NoError(t, err)
		assert.False(t, result)
		mockQueries.AssertExpectations(t)
	})
}

func TestProductService_CreateUnit(t *testing.T) {
	service, mockQueries := setupTestService()
	ctx := context.Background()
	
	t.Run("successful unit creation", func(t *testing.T) {
		unitID := uuid.New()
		tenantID := uuid.New()
		name := "kilogram"
		abbreviation := "kg"
		
		expectedParams := db.CreateUnitParams{
			TenantID:     tenantID,
			Name:         name,
			Abbreviation: abbreviation,
		}
		
		expectedUnit := db.Unit{
			ID:           unitID,
			TenantID:     tenantID,
			Name:         name,
			Abbreviation: abbreviation,
		}
		
		mockQueries.On("CreateUnit", ctx, expectedParams).Return(expectedUnit, nil)
		
		result, err := service.CreateUnit(ctx, unitID, tenantID, name, abbreviation)
		
		assert.NoError(t, err)
		assert.Equal(t, expectedUnit, result)
		mockQueries.AssertExpectations(t)
	})
}

func TestProductService_HelperFunctions(t *testing.T) {
	t.Run("stringPtrToNullString", func(t *testing.T) {
		// Test with valid string
		str := "test"
		result := stringPtrToNullString(&str)
		assert.True(t, result.Valid)
		assert.Equal(t, "test", result.String)
		
		// Test with nil
		result = stringPtrToNullString(nil)
		assert.False(t, result.Valid)
	})
	
	t.Run("intPtrToNullString", func(t *testing.T) {
		// Test with valid int
		num := 42
		result := intPtrToNullString(&num)
		assert.True(t, result.Valid)
		assert.Equal(t, "42", result.String)
		
		// Test with nil
		result = intPtrToNullString(nil)
		assert.False(t, result.Valid)
	})
	
	t.Run("uuidPtrToNullUUID", func(t *testing.T) {
		// Test with valid UUID
		id := uuid.New()
		result := uuidPtrToNullUUID(&id)
		assert.True(t, result.Valid)
		assert.Equal(t, id, result.UUID)
		
		// Test with nil
		result = uuidPtrToNullUUID(nil)
		assert.False(t, result.Valid)
	})
}

func TestProductService_ToUpdateProductPatchParms(t *testing.T) {
	productID := uuid.New()
	tenantID := uuid.New()
	unitID := uuid.New()
	
	patch := ProductInputRequest{
		Name:         stringPtr("Updated Product"),
		Price:        intPtr(1500),
		Description:  stringPtr("Updated description"),
		ImageUrl:     stringPtr("http://example.com/new-image.jpg"),
		Brand:        stringPtr("Updated Brand"),
		UnitID:       &unitID,
		PricePerUnit: intPtr(150),
		GstPercent:   intPtr(20),
	}
	
	result := ToUpdateProductPatchParms(patch, productID, tenantID)
	
	assert.Equal(t, productID, result.ID)
	assert.Equal(t, tenantID, result.TenantID)
	assert.True(t, result.Name.Valid)
	assert.Equal(t, "Updated Product", result.Name.String)
	assert.True(t, result.Price.Valid)
	assert.Equal(t, "1500", result.Price.String)
	assert.True(t, result.UnitID.Valid)
	assert.Equal(t, unitID, result.UnitID.UUID)
}

func TestNewProductService(t *testing.T) {
	// This would typically use a real pgxpool.Pool, but for testing we can pass nil
	queries := new(MockQueries)
	service := NewProductService(nil, queries)
	
	assert.NotNil(t, service)
	assert.Equal(t, queries, service.q)
}

func TestProductService_CreateProductLegacy(t *testing.T) {
	service, mockQueries := setupTestService()
	ctx := context.Background()
	
	tenantID := uuid.New()
	unitID := uuid.New()
	
	expectedProduct := db.Product{
		ID:       uuid.New(),
		TenantID: tenantID,
		Sku:      "LEGACY-001",
		Name:     "Legacy Product",
	}
	
	mockQueries.On("CreateProduct", ctx, mock.AnythingOfType("db.CreateProductParams")).
		Return(expectedProduct, nil)
	
	result, err := service.CreateProductLegacy(ctx, tenantID, "LEGACY-001", "Legacy Product", 1000, "Description", "Image", "Brand", unitID, 100, 18)
	
	assert.NoError(t, err)
	assert.Equal(t, expectedProduct, result)
	mockQueries.AssertExpectations(t)
}