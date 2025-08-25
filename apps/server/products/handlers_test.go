package products

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strconv"
	"testing"

	"agromart2/db"
	"agromart2/internal/errors"
	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

// MockProductService implements the ProductServiceInterface for testing
type MockProductService struct {
	mock.Mock
}

func (m *MockProductService) CreateProduct(ctx context.Context, params CreateProductParams) (db.Product, error) {
	args := m.Called(ctx, params)
	if args.Get(0) == nil {
		return db.Product{}, args.Error(1)
	}
	return args.Get(0).(db.Product), args.Error(1)
}

func (m *MockProductService) GetProductByID(ctx context.Context, id, tenantID uuid.UUID) (db.Product, error) {
	args := m.Called(ctx, id, tenantID)
	if args.Get(0) == nil {
		return db.Product{}, args.Error(1)
	}
	return args.Get(0).(db.Product), args.Error(1)
}

func (m *MockProductService) ListProducts(ctx context.Context, tenantID uuid.UUID, limit, offset int) ([]db.Product, error) {
	args := m.Called(ctx, tenantID, limit, offset)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]db.Product), args.Error(1)
}

func (m *MockProductService) CountProducts(ctx context.Context, tenantID uuid.UUID) (int64, error) {
	args := m.Called(ctx, tenantID)
	return args.Get(0).(int64), args.Error(1)
}

func (m *MockProductService) SearchProducts(ctx context.Context, tenantID uuid.UUID, query string, limit, offset int) ([]db.Product, error) {
	args := m.Called(ctx, tenantID, query, limit, offset)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]db.Product), args.Error(1)
}

func (m *MockProductService) PatchProduct(ctx context.Context, tenantID, productID uuid.UUID, req ProductInputRequest) error {
	args := m.Called(ctx, tenantID, productID, req)
	return args.Error(0)
}

func (m *MockProductService) DeleteProduct(ctx context.Context, id, tenantID uuid.UUID) error {
	args := m.Called(ctx, id, tenantID)
	return args.Error(0)
}

func (m *MockProductService) ListUnits(ctx context.Context, tenantID uuid.UUID, limit, offset int) ([]db.Unit, error) {
	args := m.Called(ctx, tenantID, limit, offset)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]db.Unit), args.Error(1)
}

func setupTestHandler() (*ProductHandler, *MockProductService) {
	mockService := new(MockProductService)
	handler := NewProductHandler(mockService)
	return handler, mockService
}

func setupEchoContext(method, path string, body interface{}) (echo.Context, *httptest.ResponseRecorder) {
	e := echo.New()
	
	var req *http.Request
	if body != nil {
		jsonBody, _ := json.Marshal(body)
		req = httptest.NewRequest(method, path, bytes.NewBuffer(jsonBody))
		req.Header.Set("Content-Type", "application/json")
	} else {
		req = httptest.NewRequest(method, path, nil)
	}
	
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	
	// Set default tenant_id for authenticated requests
	tenantID := uuid.New()
	c.Set("tenant_id", tenantID.String())
	
	return c, rec
}

func TestProductHandler_CreateProduct(t *testing.T) {
	handler, mockService := setupTestHandler()
	
	t.Run("successful creation", func(t *testing.T) {
		createReq := CreateProductRequest{
			SKU:         "TEST-001",
			Name:        "Test Product",
			Price:       1000,
			Description: "Test description",
			Brand:       "Test Brand",
		}
		
		expectedProduct := db.Product{
			ID:          uuid.New(),
			Sku:         createReq.SKU,
			Name:        createReq.Name,
			Price:       strconv.Itoa(createReq.Price),
			Description: sql.NullString{String: createReq.Description, Valid: true},
			Brand:       sql.NullString{String: createReq.Brand, Valid: true},
		}
		
		mockService.On("CreateProduct", mock.Anything, mock.AnythingOfType("CreateProductParams")).
			Return(expectedProduct, nil)
		
		c, rec := setupEchoContext("POST", "/products", createReq)
		
		err := handler.CreateProduct(c)
		
		assert.NoError(t, err)
		assert.Equal(t, http.StatusCreated, rec.Code)
		
		var response map[string]interface{}
		err = json.Unmarshal(rec.Body.Bytes(), &response)
		assert.NoError(t, err)
		assert.True(t, response["success"].(bool))
		assert.Equal(t, "Product created successfully", response["message"])
		
		mockService.AssertExpectations(t)
	})
	
	t.Run("invalid request body", func(t *testing.T) {
		c, rec := setupEchoContext("POST", "/products", "invalid json")
		
		err := handler.CreateProduct(c)
		
		assert.NoError(t, err)
		assert.Equal(t, http.StatusBadRequest, rec.Code)
		
		var response map[string]interface{}
		err = json.Unmarshal(rec.Body.Bytes(), &response)
		assert.NoError(t, err)
		assert.False(t, response["success"].(bool))
	})
	
	t.Run("missing required fields", func(t *testing.T) {
		createReq := CreateProductRequest{
			SKU:   "", // Missing required field
			Name:  "Test Product",
			Price: 1000,
		}
		
		c, rec := setupEchoContext("POST", "/products", createReq)
		
		err := handler.CreateProduct(c)
		
		assert.NoError(t, err)
		assert.Equal(t, http.StatusBadRequest, rec.Code)
		
		var response map[string]interface{}
		err = json.Unmarshal(rec.Body.Bytes(), &response)
		assert.NoError(t, err)
		assert.False(t, response["success"].(bool))
		assert.Contains(t, response["error"].(map[string]interface{})["message"], "sku, name and positive price are required")
	})
	
	t.Run("invalid tenant", func(t *testing.T) {
		createReq := CreateProductRequest{
			SKU:   "TEST-001",
			Name:  "Test Product",
			Price: 1000,
		}
		
		c, rec := setupEchoContext("POST", "/products", createReq)
		c.Set("tenant_id", "invalid-uuid")
		
		err := handler.CreateProduct(c)
		
		assert.NoError(t, err)
		assert.Equal(t, http.StatusUnauthorized, rec.Code)
	})
	
	t.Run("service error", func(t *testing.T) {
		createReq := CreateProductRequest{
			SKU:   "TEST-001",
			Name:  "Test Product",
			Price: 1000,
		}
		
		mockService.On("CreateProduct", mock.Anything, mock.AnythingOfType("products.CreateProductParams")).
			Return(db.Product{}, fmt.Errorf("database error"))
		
		c, rec := setupEchoContext("POST", "/products", createReq)
		
		err := handler.CreateProduct(c)
		
		assert.NoError(t, err)
		assert.Equal(t, http.StatusInternalServerError, rec.Code)
		
		mockService.AssertExpectations(t)
	})
}

func TestProductHandler_GetProduct(t *testing.T) {
	handler, mockService := setupTestHandler()
	
	t.Run("successful get", func(t *testing.T) {
		productID := uuid.New()
		tenantID := uuid.New()
		
		expectedProduct := db.Product{
			ID:   productID,
			Sku:  "TEST-001",
			Name: "Test Product",
		}
		
		mockService.On("GetProductByID", mock.Anything, productID, tenantID).
			Return(expectedProduct, nil)
		
		c, rec := setupEchoContext("GET", fmt.Sprintf("/products/%s", productID), nil)
		c.SetParamNames("id")
		c.SetParamValues(productID.String())
		c.Set("tenant_id", tenantID.String())
		
		err := handler.GetProduct(c)
		
		assert.NoError(t, err)
		assert.Equal(t, http.StatusOK, rec.Code)
		
		var response map[string]interface{}
		err = json.Unmarshal(rec.Body.Bytes(), &response)
		assert.NoError(t, err)
		assert.True(t, response["success"].(bool))
		
		mockService.AssertExpectations(t)
	})
	
	t.Run("invalid product ID", func(t *testing.T) {
		c, rec := setupEchoContext("GET", "/products/invalid-id", nil)
		c.SetParamNames("id")
		c.SetParamValues("invalid-id")
		
		err := handler.GetProduct(c)
		
		assert.NoError(t, err)
		assert.Equal(t, http.StatusBadRequest, rec.Code)
	})
	
	t.Run("product not found", func(t *testing.T) {
		productID := uuid.New()
		tenantID := uuid.New()
		
		mockService.On("GetProductByID", mock.Anything, productID, tenantID).
			Return(db.Product{}, fmt.Errorf("not found"))
		
		c, rec := setupEchoContext("GET", fmt.Sprintf("/products/%s", productID), nil)
		c.SetParamNames("id")
		c.SetParamValues(productID.String())
		c.Set("tenant_id", tenantID.String())
		
		err := handler.GetProduct(c)
		
		assert.NoError(t, err)
		assert.Equal(t, http.StatusNotFound, rec.Code)
		
		mockService.AssertExpectations(t)
	})
}

func TestProductHandler_ListProducts(t *testing.T) {
	handler, mockService := setupTestHandler()
	
	t.Run("successful list with pagination", func(t *testing.T) {
		tenantID := uuid.New()
		
		products := []db.Product{
			{ID: uuid.New(), Sku: "TEST-001", Name: "Product 1"},
			{ID: uuid.New(), Sku: "TEST-002", Name: "Product 2"},
		}
		
		mockService.On("ListProducts", mock.Anything, tenantID, 20, 0).
			Return(products, nil)
		mockService.On("CountProducts", mock.Anything, tenantID).
			Return(int64(2), nil)
		
		c, rec := setupEchoContext("GET", "/products", nil)
		c.Set("tenant_id", tenantID.String())
		
		err := handler.ListProducts(c)
		
		assert.NoError(t, err)
		assert.Equal(t, http.StatusOK, rec.Code)
		
		var response map[string]interface{}
		err = json.Unmarshal(rec.Body.Bytes(), &response)
		assert.NoError(t, err)
		assert.True(t, response["success"].(bool))
		
		pagination := response["pagination"].(map[string]interface{})
		assert.Equal(t, float64(1), pagination["page"])
		assert.Equal(t, float64(20), pagination["limit"])
		assert.Equal(t, float64(2), pagination["total"])
		
		mockService.AssertExpectations(t)
	})
	
	t.Run("custom pagination parameters", func(t *testing.T) {
		tenantID := uuid.New()
		
		products := []db.Product{}
		
		mockService.On("ListProducts", mock.Anything, tenantID, 10, 10).
			Return(products, nil)
		mockService.On("CountProducts", mock.Anything, tenantID).
			Return(int64(0), nil)
		
		c, rec := setupEchoContext("GET", "/products?page=2&limit=10", nil)
		c.Set("tenant_id", tenantID.String())
		c.Request().URL.RawQuery = "page=2&limit=10"
		
		err := handler.ListProducts(c)
		
		assert.NoError(t, err)
		assert.Equal(t, http.StatusOK, rec.Code)
		
		mockService.AssertExpectations(t)
	})
}

func TestProductHandler_SearchProducts(t *testing.T) {
	handler, mockService := setupTestHandler()
	
	t.Run("successful search", func(t *testing.T) {
		tenantID := uuid.New()
		query := "test"
		
		products := []db.Product{
			{ID: uuid.New(), Sku: "TEST-001", Name: "Test Product"},
		}
		
		mockService.On("SearchProducts", mock.Anything, tenantID, query, 20, 0).
			Return(products, nil)
		
		c, rec := setupEchoContext("GET", fmt.Sprintf("/products/search?q=%s", query), nil)
		c.Set("tenant_id", tenantID.String())
		c.Request().URL.RawQuery = fmt.Sprintf("q=%s", query)
		
		err := handler.SearchProducts(c)
		
		assert.NoError(t, err)
		assert.Equal(t, http.StatusOK, rec.Code)
		
		var response map[string]interface{}
		err = json.Unmarshal(rec.Body.Bytes(), &response)
		assert.NoError(t, err)
		assert.True(t, response["success"].(bool))
		assert.Equal(t, query, response["query"])
		
		mockService.AssertExpectations(t)
	})
	
	t.Run("missing search query", func(t *testing.T) {
		c, rec := setupEchoContext("GET", "/products/search", nil)
		
		err := handler.SearchProducts(c)
		
		assert.NoError(t, err)
		assert.Equal(t, http.StatusBadRequest, rec.Code)
		
		var response map[string]interface{}
		err = json.Unmarshal(rec.Body.Bytes(), &response)
		assert.NoError(t, err)
		assert.False(t, response["success"].(bool))
		assert.Contains(t, response["error"].(map[string]interface{})["message"], "search query is required")
	})
}

func TestProductHandler_PatchProduct(t *testing.T) {
	handler, mockService := setupTestHandler()
	
	t.Run("successful patch", func(t *testing.T) {
		productID := uuid.New()
		tenantID := uuid.New()
		
		patchReq := ProductInputRequest{
			Name:  stringPtr("Updated Product"),
			Price: intPtr(1500),
		}
		
		mockService.On("PatchProduct", mock.Anything, tenantID, productID, patchReq).
			Return(nil)
		
		c, rec := setupEchoContext("PATCH", fmt.Sprintf("/products/%s", productID), patchReq)
		c.SetParamNames("id")
		c.SetParamValues(productID.String())
		c.Set("tenant_id", tenantID.String())
		
		err := handler.PatchProduct(c)
		
		assert.NoError(t, err)
		assert.Equal(t, http.StatusOK, rec.Code)
		
		var response map[string]interface{}
		err = json.Unmarshal(rec.Body.Bytes(), &response)
		assert.NoError(t, err)
		assert.True(t, response["success"].(bool))
		assert.Equal(t, "Product updated successfully", response["message"])
		
		mockService.AssertExpectations(t)
	})
	
	t.Run("invalid product ID", func(t *testing.T) {
		c, rec := setupEchoContext("PATCH", "/products/invalid-id", map[string]string{"name": "Updated"})
		c.SetParamNames("id")
		c.SetParamValues("invalid-id")
		
		err := handler.PatchProduct(c)
		
		assert.NoError(t, err)
		assert.Equal(t, http.StatusBadRequest, rec.Code)
	})
}

func TestProductHandler_DeleteProduct(t *testing.T) {
	handler, mockService := setupTestHandler()
	
	t.Run("successful delete", func(t *testing.T) {
		productID := uuid.New()
		tenantID := uuid.New()
		
		mockService.On("DeleteProduct", mock.Anything, productID, tenantID).
			Return(nil)
		
		c, rec := setupEchoContext("DELETE", fmt.Sprintf("/products/%s", productID), nil)
		c.SetParamNames("id")
		c.SetParamValues(productID.String())
		c.Set("tenant_id", tenantID.String())
		
		err := handler.DeleteProduct(c)
		
		assert.NoError(t, err)
		assert.Equal(t, http.StatusOK, rec.Code)
		
		var response map[string]interface{}
		err = json.Unmarshal(rec.Body.Bytes(), &response)
		assert.NoError(t, err)
		assert.True(t, response["success"].(bool))
		assert.Equal(t, "Product deleted successfully", response["message"])
		
		mockService.AssertExpectations(t)
	})
	
	t.Run("custom error handling", func(t *testing.T) {
		productID := uuid.New()
		tenantID := uuid.New()
		
		customErr := errors.NewNotFound("product not found")
		mockService.On("DeleteProduct", mock.Anything, productID, tenantID).
			Return(customErr)
		
		c, rec := setupEchoContext("DELETE", fmt.Sprintf("/products/%s", productID), nil)
		c.SetParamNames("id")
		c.SetParamValues(productID.String())
		c.Set("tenant_id", tenantID.String())
		
		err := handler.DeleteProduct(c)
		
		assert.NoError(t, err)
		assert.Equal(t, http.StatusNotFound, rec.Code)
		
		mockService.AssertExpectations(t)
	})
}

func TestProductHandler_ListUnits(t *testing.T) {
	handler, mockService := setupTestHandler()
	
	t.Run("successful list", func(t *testing.T) {
		tenantID := uuid.New()
		
		units := []db.Unit{
			{ID: uuid.New(), Name: "kg", Abbreviation: "kg"},
			{ID: uuid.New(), Name: "liter", Abbreviation: "L"},
		}
		
		mockService.On("ListUnits", mock.Anything, tenantID, 20, 0).
			Return(units, nil)
		
		c, rec := setupEchoContext("GET", "/units", nil)
		c.Set("tenant_id", tenantID.String())
		
		err := handler.ListUnits(c)
		
		assert.NoError(t, err)
		assert.Equal(t, http.StatusOK, rec.Code)
		
		var response map[string]interface{}
		err = json.Unmarshal(rec.Body.Bytes(), &response)
		assert.NoError(t, err)
		assert.True(t, response["success"].(bool))
		
		mockService.AssertExpectations(t)
	})
}

func TestProductHandler_RegisterRoutes(t *testing.T) {
	handler, _ := setupTestHandler()
	
	e := echo.New()
	g := e.Group("/api")
	
	// Should not panic when registering routes
	require.NotPanics(t, func() {
		handler.RegisterRoutes(g)
	})
	
	// Verify routes are registered (basic check)
	routes := e.Routes()
	require.NotEmpty(t, routes)
	
	// Check that expected routes exist
	expectedRoutes := []string{
		"POST /api/products",
		"GET /api/products",
		"GET /api/products/search",
		"GET /api/products/:id",
		"PATCH /api/products/:id",
		"DELETE /api/products/:id",
		"GET /api/units",
	}
	
	routeMap := make(map[string]bool)
	for _, route := range routes {
		key := fmt.Sprintf("%s %s", route.Method, route.Path)
		routeMap[key] = true
	}
	
	for _, expected := range expectedRoutes {
		assert.True(t, routeMap[expected], "Route %s should be registered", expected)
	}
}

// Test constructor
func TestNewProductHandler(t *testing.T) {
	mockService := new(MockProductService)
	handler := NewProductHandler(mockService)
	
	assert.NotNil(t, handler)
	assert.Equal(t, mockService, handler.service)
}

// Helper functions for tests
func stringPtr(s string) *string {
	return &s
}

func intPtr(i int) *int {
	return &i
}