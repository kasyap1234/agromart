package products

import (
	"context"
	"database/sql"
	"errors"
	"math/big"
	"testing"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"

	"agromart2/db"
)

// MockQueries is a mock implementation of the database queries
type MockQueries struct {
	mock.Mock
}

func (m *MockQueries) CreateProduct(ctx context.Context, arg db.CreateProductParams) (db.Product, error) {
	args := m.Called(ctx, arg)
	return args.Get(0).(db.Product), args.Error(1)
}

func (m *MockQueries) GetProductByID(ctx context.Context, arg db.GetProductByIDParams) (db.Product, error) {
	args := m.Called(ctx, arg)
	return args.Get(0).(db.Product), args.Error(1)
}

func (m *MockQueries) ListProducts(ctx context.Context, arg db.ListProductsParams) ([]db.Product, error) {
	args := m.Called(ctx, arg)
	return args.Get(0).([]db.Product), args.Error(1)
}

func (m *MockQueries) UpdateProduct(ctx context.Context, arg db.UpdateProductParams) (db.Product, error) {
	args := m.Called(ctx, arg)
	return args.Get(0).(db.Product), args.Error(1)
}

func (m *MockQueries) DeleteProduct(ctx context.Context, arg db.DeleteProductParams) error {
	args := m.Called(ctx, arg)
	return args.Error(0)
}

func (m *MockQueries) SearchProducts(ctx context.Context, arg db.SearchProductsParams) ([]db.Product, error) {
	args := m.Called(ctx, arg)
	return args.Get(0).([]db.Product), args.Error(1)
}

func (m *MockQueries) GetProductBySKU(ctx context.Context, arg db.GetProductBySKUParams) (db.Product, error) {
	args := m.Called(ctx, arg)
	return args.Get(0).(db.Product), args.Error(1)
}

func TestProductService_CreateProduct(t *testing.T) {
	mockQueries := &MockQueries{}
	service := &ProductService{q: mockQueries}

	tenantID := uuid.New()
	unitID := uuid.New()

	t.Run("successful product creation", func(t *testing.T) {
		req := CreateProductRequest{
			SKU:          "TEST-001",
			Name:         "Test Product",
			Price:        100.50,
			Description:  "Test description",
			ImageURL:     "https://example.com/image.jpg",
			Brand:        "Test Brand",
			UnitID:       unitID,
			PricePerUnit: 10.05,
			GSTPercent:   18.0,
		}

		expectedProduct := db.Product{
			ID:           uuid.New(),
			TenantID:     tenantID,
			Sku:          req.SKU,
			Name:         req.Name,
			Price:        pgtype.Numeric{Int: big.NewInt(10050), Exp: -2, Valid: true},
			Description:  pgtype.Text{String: req.Description, Valid: true},
			ImageUrl:     pgtype.Text{String: req.ImageURL, Valid: true},
			Brand:        pgtype.Text{String: req.Brand, Valid: true},
			UnitID:       req.UnitID,
			PricePerUnit: pgtype.Numeric{Int: big.NewInt(1005), Exp: -2, Valid: true},
			GstPercent:   pgtype.Numeric{Int: big.NewInt(1800), Exp: -2, Valid: true},
		}

		mockQueries.On("CreateProduct", mock.Anything, mock.MatchedBy(func(arg db.CreateProductParams) bool {
			return arg.Sku == req.SKU &&
				arg.Name == req.Name &&
				arg.TenantID == tenantID
		})).Return(expectedProduct, nil)

		product, err := service.CreateProduct(context.Background(), req, tenantID)

		require.NoError(t, err)
		assert.Equal(t, expectedProduct.ID, product.ID)
		assert.Equal(t, expectedProduct.Sku, product.Sku)
		assert.Equal(t, expectedProduct.Name, product.Name)
		assert.Equal(t, expectedProduct.TenantID, product.TenantID)

		mockQueries.AssertExpectations(t)
	})

	t.Run("duplicate SKU error", func(t *testing.T) {
		req := CreateProductRequest{
			SKU:    "DUPLICATE-001",
			Name:   "Duplicate Product",
			UnitID: unitID,
		}

		mockQueries.On("CreateProduct", mock.Anything, mock.Anything).
			Return(db.Product{}, errors.New("duplicate key value violates unique constraint"))

		product, err := service.CreateProduct(context.Background(), req, tenantID)

		assert.Error(t, err)
		assert.Equal(t, db.Product{}, product)
		assert.Contains(t, err.Error(), "failed to create product")

		mockQueries.AssertExpectations(t)
	})

	t.Run("database connection error", func(t *testing.T) {
		req := CreateProductRequest{
			SKU:    "ERROR-001",
			Name:   "Error Product",
			UnitID: unitID,
		}

		mockQueries.On("CreateProduct", mock.Anything, mock.Anything).
			Return(db.Product{}, errors.New("connection failed"))

		product, err := service.CreateProduct(context.Background(), req, tenantID)

		assert.Error(t, err)
		assert.Equal(t, db.Product{}, product)

		mockQueries.AssertExpectations(t)
	})

	t.Run("empty required fields", func(t *testing.T) {
		req := CreateProductRequest{
			SKU:    "",
			Name:   "",
			UnitID: uuid.Nil,
		}

		mockQueries.On("CreateProduct", mock.Anything, mock.MatchedBy(func(arg db.CreateProductParams) bool {
			return arg.Sku == "" && arg.Name == ""
		})).Return(db.Product{}, errors.New("validation error"))

		product, err := service.CreateProduct(context.Background(), req, tenantID)

		assert.Error(t, err)
		assert.Equal(t, db.Product{}, product)

		mockQueries.AssertExpectations(t)
	})
}

func TestProductService_GetProductByID(t *testing.T) {
	mockQueries := &MockQueries{}
	service := &ProductService{q: mockQueries}

	productID := uuid.New()
	tenantID := uuid.New()

	t.Run("product found", func(t *testing.T) {
		expectedProduct := db.Product{
			ID:       productID,
			TenantID: tenantID,
			Sku:      "TEST-001",
			Name:     "Test Product",
		}

		mockQueries.On("GetProductByID", mock.Anything, db.GetProductByIDParams{
			ID:       productID,
			TenantID: tenantID,
		}).Return(expectedProduct, nil)

		product, err := service.GetProductByID(context.Background(), productID, tenantID)

		require.NoError(t, err)
		assert.Equal(t, expectedProduct.ID, product.ID)
		assert.Equal(t, expectedProduct.Sku, product.Sku)
		assert.Equal(t, expectedProduct.Name, product.Name)

		mockQueries.AssertExpectations(t)
	})

	t.Run("product not found", func(t *testing.T) {
		mockQueries.On("GetProductByID", mock.Anything, db.GetProductByIDParams{
			ID:       productID,
			TenantID: tenantID,
		}).Return(db.Product{}, sql.ErrNoRows)

		product, err := service.GetProductByID(context.Background(), productID, tenantID)

		assert.Error(t, err)
		assert.Equal(t, db.Product{}, product)
		assert.Contains(t, err.Error(), "product not found")

		mockQueries.AssertExpectations(t)
	})

	t.Run("database error", func(t *testing.T) {
		mockQueries.On("GetProductByID", mock.Anything, db.GetProductByIDParams{
			ID:       productID,
			TenantID: tenantID,
		}).Return(db.Product{}, errors.New("database error"))

		product, err := service.GetProductByID(context.Background(), productID, tenantID)

		assert.Error(t, err)
		assert.Equal(t, db.Product{}, product)

		mockQueries.AssertExpectations(t)
	})

	t.Run("invalid product ID", func(t *testing.T) {
		invalidID := uuid.Nil

		mockQueries.On("GetProductByID", mock.Anything, db.GetProductByIDParams{
			ID:       invalidID,
			TenantID: tenantID,
		}).Return(db.Product{}, sql.ErrNoRows)

		product, err := service.GetProductByID(context.Background(), invalidID, tenantID)

		assert.Error(t, err)
		assert.Equal(t, db.Product{}, product)

		mockQueries.AssertExpectations(t)
	})
}

func TestProductService_ListProducts(t *testing.T) {
	mockQueries := &MockQueries{}
	service := &ProductService{q: mockQueries}

	tenantID := uuid.New()

	t.Run("successful list with pagination", func(t *testing.T) {
		params := ListProductsParams{
			TenantID: tenantID,
			Limit:    10,
			Offset:   0,
		}

		expectedProducts := []db.Product{
			{
				ID:       uuid.New(),
				TenantID: tenantID,
				Sku:      "PROD-001",
				Name:     "Product 1",
			},
			{
				ID:       uuid.New(),
				TenantID: tenantID,
				Sku:      "PROD-002",
				Name:     "Product 2",
			},
		}

		mockQueries.On("ListProducts", mock.Anything, db.ListProductsParams{
			TenantID: tenantID,
			Limit:    10,
			Offset:   0,
		}).Return(expectedProducts, nil)

		products, err := service.ListProducts(context.Background(), params)

		require.NoError(t, err)
		assert.Len(t, products, 2)
		assert.Equal(t, expectedProducts[0].Sku, products[0].Sku)
		assert.Equal(t, expectedProducts[1].Sku, products[1].Sku)

		mockQueries.AssertExpectations(t)
	})

	t.Run("empty result", func(t *testing.T) {
		params := ListProductsParams{
			TenantID: tenantID,
			Limit:    10,
			Offset:   0,
		}

		mockQueries.On("ListProducts", mock.Anything, db.ListProductsParams{
			TenantID: tenantID,
			Limit:    10,
			Offset:   0,
		}).Return([]db.Product{}, nil)

		products, err := service.ListProducts(context.Background(), params)

		require.NoError(t, err)
		assert.Len(t, products, 0)

		mockQueries.AssertExpectations(t)
	})

	t.Run("database error", func(t *testing.T) {
		params := ListProductsParams{
			TenantID: tenantID,
			Limit:    10,
			Offset:   0,
		}

		mockQueries.On("ListProducts", mock.Anything, db.ListProductsParams{
			TenantID: tenantID,
			Limit:    10,
			Offset:   0,
		}).Return([]db.Product{}, errors.New("database connection failed"))

		products, err := service.ListProducts(context.Background(), params)

		assert.Error(t, err)
		assert.Nil(t, products)

		mockQueries.AssertExpectations(t)
	})

	t.Run("large offset", func(t *testing.T) {
		params := ListProductsParams{
			TenantID: tenantID,
			Limit:    10,
			Offset:   1000,
		}

		mockQueries.On("ListProducts", mock.Anything, db.ListProductsParams{
			TenantID: tenantID,
			Limit:    10,
			Offset:   1000,
		}).Return([]db.Product{}, nil)

		products, err := service.ListProducts(context.Background(), params)

		require.NoError(t, err)
		assert.Len(t, products, 0)

		mockQueries.AssertExpectations(t)
	})

	t.Run("zero limit", func(t *testing.T) {
		params := ListProductsParams{
			TenantID: tenantID,
			Limit:    0,
			Offset:   0,
		}

		mockQueries.On("ListProducts", mock.Anything, db.ListProductsParams{
			TenantID: tenantID,
			Limit:    0,
			Offset:   0,
		}).Return([]db.Product{}, nil)

		products, err := service.ListProducts(context.Background(), params)

		require.NoError(t, err)
		assert.Len(t, products, 0)

		mockQueries.AssertExpectations(t)
	})
}

func TestProductService_UpdateProduct(t *testing.T) {
	mockQueries := &MockQueries{}
	service := &ProductService{q: mockQueries}

	productID := uuid.New()
	tenantID := uuid.New()

	t.Run("successful product update", func(t *testing.T) {
		updatedName := "Updated Product Name"
		updatedPrice := 150.75

		req := ProductInputRequest{
			Name:  &updatedName,
			Price: &updatedPrice,
		}

		params := ToUpdateProductPatchParms(req, productID, tenantID)

		expectedProduct := db.Product{
			ID:       productID,
			TenantID: tenantID,
			Sku:      "ORIGINAL-SKU",
			Name:     updatedName,
			Price:    pgtype.Numeric{Int: big.NewInt(15075), Exp: -2, Valid: true},
		}

		mockQueries.On("UpdateProduct", mock.Anything, params).Return(expectedProduct, nil)

		product, err := service.UpdateProduct(context.Background(), req, productID, tenantID)

		require.NoError(t, err)
		assert.Equal(t, expectedProduct.ID, product.ID)
		assert.Equal(t, expectedProduct.Name, product.Name)

		mockQueries.AssertExpectations(t)
	})

	t.Run("partial update", func(t *testing.T) {
		updatedDescription := "Updated description only"

		req := ProductInputRequest{
			Description: &updatedDescription,
		}

		params := ToUpdateProductPatchParms(req, productID, tenantID)

		expectedProduct := db.Product{
			ID:          productID,
			TenantID:    tenantID,
			Sku:         "ORIGINAL-SKU",
			Name:        "Original Name",
			Description: pgtype.Text{String: updatedDescription, Valid: true},
		}

		mockQueries.On("UpdateProduct", mock.Anything, params).Return(expectedProduct, nil)

		product, err := service.UpdateProduct(context.Background(), req, productID, tenantID)

		require.NoError(t, err)
		assert.Equal(t, expectedProduct.Description, product.Description)

		mockQueries.AssertExpectations(t)
	})

	t.Run("product not found", func(t *testing.T) {
		updatedName := "Non-existent Product"

		req := ProductInputRequest{
			Name: &updatedName,
		}

		params := ToUpdateProductPatchParms(req, productID, tenantID)

		mockQueries.On("UpdateProduct", mock.Anything, params).Return(db.Product{}, sql.ErrNoRows)

		product, err := service.UpdateProduct(context.Background(), req, productID, tenantID)

		assert.Error(t, err)
		assert.Equal(t, db.Product{}, product)
		assert.Contains(t, err.Error(), "product not found")

		mockQueries.AssertExpectations(t)
	})

	t.Run("database error", func(t *testing.T) {
		updatedName := "Error Product"

		req := ProductInputRequest{
			Name: &updatedName,
		}

		params := ToUpdateProductPatchParms(req, productID, tenantID)

		mockQueries.On("UpdateProduct", mock.Anything, params).Return(db.Product{}, errors.New("database error"))

		product, err := service.UpdateProduct(context.Background(), req, productID, tenantID)

		assert.Error(t, err)
		assert.Equal(t, db.Product{}, product)

		mockQueries.AssertExpectations(t)
	})

	t.Run("empty update request", func(t *testing.T) {
		req := ProductInputRequest{}

		params := ToUpdateProductPatchParms(req, productID, tenantID)

		// Should still call database even with empty params
		expectedProduct := db.Product{
			ID:       productID,
			TenantID: tenantID,
			Sku:      "UNCHANGED-SKU",
			Name:     "Unchanged Name",
		}

		mockQueries.On("UpdateProduct", mock.Anything, params).Return(expectedProduct, nil)

		product, err := service.UpdateProduct(context.Background(), req, productID, tenantID)

		require.NoError(t, err)
		assert.Equal(t, expectedProduct.ID, product.ID)

		mockQueries.AssertExpectations(t)
	})
}

func TestProductService_DeleteProduct(t *testing.T) {
	mockQueries := &MockQueries{}
	service := &ProductService{q: mockQueries}

	productID := uuid.New()
	tenantID := uuid.New()

	t.Run("successful product deletion", func(t *testing.T) {
		mockQueries.On("DeleteProduct", mock.Anything, db.DeleteProductParams{
			ID:       productID,
			TenantID: tenantID,
		}).Return(nil)

		err := service.DeleteProduct(context.Background(), productID, tenantID)

		require.NoError(t, err)

		mockQueries.AssertExpectations(t)
	})

	t.Run("product not found", func(t *testing.T) {
		mockQueries.On("DeleteProduct", mock.Anything, db.DeleteProductParams{
			ID:       productID,
			TenantID: tenantID,
		}).Return(sql.ErrNoRows)

		err := service.DeleteProduct(context.Background(), productID, tenantID)

		assert.Error(t, err)
		assert.Contains(t, err.Error(), "product not found")

		mockQueries.AssertExpectations(t)
	})

	t.Run("database error", func(t *testing.T) {
		mockQueries.On("DeleteProduct", mock.Anything, db.DeleteProductParams{
			ID:       productID,
			TenantID: tenantID,
		}).Return(errors.New("foreign key constraint violation"))

		err := service.DeleteProduct(context.Background(), productID, tenantID)

		assert.Error(t, err)

		mockQueries.AssertExpectations(t)
	})

	t.Run("product with dependencies", func(t *testing.T) {
		mockQueries.On("DeleteProduct", mock.Anything, db.DeleteProductParams{
			ID:       productID,
			TenantID: tenantID,
		}).Return(errors.New("cannot delete product with existing inventory"))

		err := service.DeleteProduct(context.Background(), productID, tenantID)

		assert.Error(t, err)

		mockQueries.AssertExpectations(t)
	})
}

func TestProductService_SearchProducts(t *testing.T) {
	mockQueries := &MockQueries{}
	service := &ProductService{q: mockQueries}

	tenantID := uuid.New()

	t.Run("successful search", func(t *testing.T) {
		searchQuery := "test product"
		params := SearchProductsParams{
			TenantID: tenantID,
			Query:    searchQuery,
			Limit:    10,
			Offset:   0,
		}

		expectedProducts := []db.Product{
			{
				ID:       uuid.New(),
				TenantID: tenantID,
				Sku:      "TEST-001",
				Name:     "Test Product 1",
			},
			{
				ID:       uuid.New(),
				TenantID: tenantID,
				Sku:      "TEST-002",
				Name:     "Test Product 2",
			},
		}

		mockQueries.On("SearchProducts", mock.Anything, db.SearchProductsParams{
			TenantID: tenantID,
			Query:    searchQuery,
			Limit:    10,
			Offset:   0,
		}).Return(expectedProducts, nil)

		products, err := service.SearchProducts(context.Background(), params)

		require.NoError(t, err)
		assert.Len(t, products, 2)
		assert.Contains(t, products[0].Name, "Test Product")
		assert.Contains(t, products[1].Name, "Test Product")

		mockQueries.AssertExpectations(t)
	})

	t.Run("no results found", func(t *testing.T) {
		searchQuery := "nonexistent"
		params := SearchProductsParams{
			TenantID: tenantID,
			Query:    searchQuery,
			Limit:    10,
			Offset:   0,
		}

		mockQueries.On("SearchProducts", mock.Anything, db.SearchProductsParams{
			TenantID: tenantID,
			Query:    searchQuery,
			Limit:    10,
			Offset:   0,
		}).Return([]db.Product{}, nil)

		products, err := service.SearchProducts(context.Background(), params)

		require.NoError(t, err)
		assert.Len(t, products, 0)

		mockQueries.AssertExpectations(t)
	})

	t.Run("empty search query", func(t *testing.T) {
		params := SearchProductsParams{
			TenantID: tenantID,
			Query:    "",
			Limit:    10,
			Offset:   0,
		}

		mockQueries.On("SearchProducts", mock.Anything, db.SearchProductsParams{
			TenantID: tenantID,
			Query:    "",
			Limit:    10,
			Offset:   0,
		}).Return([]db.Product{}, nil)

		products, err := service.SearchProducts(context.Background(), params)

		require.NoError(t, err)
		assert.Len(t, products, 0)

		mockQueries.AssertExpectations(t)
	})

	t.Run("database error", func(t *testing.T) {
		searchQuery := "error query"
		params := SearchProductsParams{
			TenantID: tenantID,
			Query:    searchQuery,
			Limit:    10,
			Offset:   0,
		}

		mockQueries.On("SearchProducts", mock.Anything, db.SearchProductsParams{
			TenantID: tenantID,
			Query:    searchQuery,
			Limit:    10,
			Offset:   0,
		}).Return([]db.Product{}, errors.New("search service unavailable"))

		products, err := service.SearchProducts(context.Background(), params)

		assert.Error(t, err)
		assert.Nil(t, products)

		mockQueries.AssertExpectations(t)
	})
}

func TestProductService_GetProductBySKU(t *testing.T) {
	mockQueries := &MockQueries{}
	service := &ProductService{q: mockQueries}

	tenantID := uuid.New()
	sku := "UNIQUE-SKU-001"

	t.Run("product found by SKU", func(t *testing.T) {
		expectedProduct := db.Product{
			ID:       uuid.New(),
			TenantID: tenantID,
			Sku:      sku,
			Name:     "Product with Unique SKU",
		}

		mockQueries.On("GetProductBySKU", mock.Anything, db.GetProductBySKUParams{
			Sku:      sku,
			TenantID: tenantID,
		}).Return(expectedProduct, nil)

		product, err := service.GetProductBySKU(context.Background(), sku, tenantID)

		require.NoError(t, err)
		assert.Equal(t, expectedProduct.ID, product.ID)
		assert.Equal(t, expectedProduct.Sku, product.Sku)

		mockQueries.AssertExpectations(t)
	})

	t.Run("product not found by SKU", func(t *testing.T) {
		nonExistentSKU := "NON-EXISTENT"

		mockQueries.On("GetProductBySKU", mock.Anything, db.GetProductBySKUParams{
			Sku:      nonExistentSKU,
			TenantID: tenantID,
		}).Return(db.Product{}, sql.ErrNoRows)

		product, err := service.GetProductBySKU(context.Background(), nonExistentSKU, tenantID)

		assert.Error(t, err)
		assert.Equal(t, db.Product{}, product)
		assert.Contains(t, err.Error(), "product not found")

		mockQueries.AssertExpectations(t)
	})

	t.Run("empty SKU", func(t *testing.T) {
		emptySKU := ""

		mockQueries.On("GetProductBySKU", mock.Anything, db.GetProductBySKUParams{
			Sku:      emptySKU,
			TenantID: tenantID,
		}).Return(db.Product{}, sql.ErrNoRows)

		product, err := service.GetProductBySKU(context.Background(), emptySKU, tenantID)

		assert.Error(t, err)
		assert.Equal(t, db.Product{}, product)

		mockQueries.AssertExpectations(t)
	})
}

func TestToUpdateProductPatchParms(t *testing.T) {
	productID := uuid.New()
	tenantID := uuid.New()

	t.Run("all fields provided", func(t *testing.T) {
		name := "Updated Name"
		price := 99.99
		description := "Updated description"
		imageURL := "https://example.com/new-image.jpg"
		brand := "Updated Brand"
		unitID := uuid.New()
		pricePerUnit := 9.99
		gstPercent := 12.0

		req := ProductInputRequest{
			Name:         &name,
			Price:        &price,
			Description:  &description,
			ImageURL:     &imageURL,
			Brand:        &brand,
			UnitID:       &unitID,
			PricePerUnit: &pricePerUnit,
			GSTPercent:   &gstPercent,
		}

		params := ToUpdateProductPatchParms(req, productID, tenantID)

		assert.Equal(t, productID, params.ID)
		assert.Equal(t, tenantID, params.TenantID)
		require.NotNil(t, params.Name)
		assert.Equal(t, name, *params.Name)
		require.NotNil(t, params.Price)
		// Price should be converted to pgtype.Numeric
		require.NotNil(t, params.Description)
		assert.Equal(t, description, *params.Description)
		require.NotNil(t, params.ImageUrl)
		assert.Equal(t, imageURL, *params.ImageUrl)
		require.NotNil(t, params.Brand)
		assert.Equal(t, brand, *params.Brand)
		require.NotNil(t, params.UnitID)
		assert.Equal(t, unitID, *params.UnitID)
	})

	t.Run("partial fields provided", func(t *testing.T) {
		name := "Only Name Updated"

		req := ProductInputRequest{
			Name: &name,
		}

		params := ToUpdateProductPatchParms(req, productID, tenantID)

		assert.Equal(t, productID, params.ID)
		assert.Equal(t, tenantID, params.TenantID)
		require.NotNil(t, params.Name)
		assert.Equal(t, name, *params.Name)
		assert.Nil(t, params.Price)
		assert.Nil(t, params.Description)
		assert.Nil(t, params.ImageUrl)
		assert.Nil(t, params.Brand)
		assert.Nil(t, params.UnitID)
	})

	t.Run("no fields provided", func(t *testing.T) {
		req := ProductInputRequest{}

		params := ToUpdateProductPatchParms(req, productID, tenantID)

		assert.Equal(t, productID, params.ID)
		assert.Equal(t, tenantID, params.TenantID)
		assert.Nil(t, params.Name)
		assert.Nil(t, params.Price)
		assert.Nil(t, params.Description)
		assert.Nil(t, params.ImageUrl)
		assert.Nil(t, params.Brand)
		assert.Nil(t, params.UnitID)
	})

	t.Run("zero values", func(t *testing.T) {
		price := 0.0
		gstPercent := 0.0

		req := ProductInputRequest{
			Price:      &price,
			GSTPercent: &gstPercent,
		}

		params := ToUpdateProductPatchParms(req, productID, tenantID)

		assert.Equal(t, productID, params.ID)
		assert.Equal(t, tenantID, params.TenantID)
		require.NotNil(t, params.Price)
		// Should handle zero values correctly
		require.NotNil(t, params.GstPercent)
	})
}

func TestProductService_Constructor(t *testing.T) {
	t.Run("service construction", func(t *testing.T) {
		mockQueries := &MockQueries{}
		service := &ProductService{q: mockQueries}

		assert.NotNil(t, service)
		assert.Equal(t, mockQueries, service.q)
	})
}

// Benchmark tests
func BenchmarkProductService_CreateProduct(b *testing.B) {
	mockQueries := &MockQueries{}
	service := &ProductService{q: mockQueries}

	tenantID := uuid.New()
	unitID := uuid.New()

	req := CreateProductRequest{
		SKU:          "BENCH-001",
		Name:         "Benchmark Product",
		Price:        100.0,
		UnitID:       unitID,
		PricePerUnit: 10.0,
	}

	expectedProduct := db.Product{
		ID:       uuid.New(),
		TenantID: tenantID,
		Sku:      req.SKU,
		Name:     req.Name,
	}

	mockQueries.On("CreateProduct", mock.Anything, mock.Anything).Return(expectedProduct, nil)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, err := service.CreateProduct(context.Background(), req, tenantID)
		if err != nil {
			b.Fatal(err)
		}
	}
}

func BenchmarkToUpdateProductPatchParms(b *testing.B) {
	productID := uuid.New()
	tenantID := uuid.New()

	name := "Benchmark Product"
	price := 99.99
	description := "Benchmark description"

	req := ProductInputRequest{
		Name:        &name,
		Price:       &price,
		Description: &description,
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = ToUpdateProductPatchParms(req, productID, tenantID)
	}
}
