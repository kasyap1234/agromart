package customers

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"agromart2/db"
	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

// MockCustomerService for testing handlers - implements CustomerQuerier interface
type MockCustomerService struct {
	mock.Mock
}

func (m *MockCustomerService) CreateCustomer(ctx context.Context, arg db.CreateCustomerParams) (db.Customer, error) {
	args := m.Called(ctx, arg)
	return args.Get(0).(db.Customer), args.Error(1)
}

func (m *MockCustomerService) GetCustomerByID(ctx context.Context, arg db.GetCustomerByIDParams) (db.Customer, error) {
	args := m.Called(ctx, arg)
	return args.Get(0).(db.Customer), args.Error(1)
}

func (m *MockCustomerService) ListCustomers(ctx context.Context, arg db.ListCustomersParams) ([]db.Customer, error) {
	args := m.Called(ctx, arg)
	return args.Get(0).([]db.Customer), args.Error(1)
}

func (m *MockCustomerService) ListActiveCustomers(ctx context.Context, arg db.ListActiveCustomersParams) ([]db.Customer, error) {
	args := m.Called(ctx, arg)
	return args.Get(0).([]db.Customer), args.Error(1)
}

func (m *MockCustomerService) UpdateCustomer(ctx context.Context, arg db.UpdateCustomerParams) (db.Customer, error) {
	args := m.Called(ctx, arg)
	return args.Get(0).(db.Customer), args.Error(1)
}

func (m *MockCustomerService) DeactivateCustomer(ctx context.Context, arg db.DeactivateCustomerParams) error {
	args := m.Called(ctx, arg)
	return args.Error(0)
}

func (m *MockCustomerService) SearchCustomers(ctx context.Context, arg db.SearchCustomersParams) ([]db.Customer, error) {
	args := m.Called(ctx, arg)
	return args.Get(0).([]db.Customer), args.Error(1)
}

func (m *MockCustomerService) CountCustomers(ctx context.Context, tenantID uuid.UUID) (int64, error) {
	args := m.Called(ctx, tenantID)
	return args.Get(0).(int64), args.Error(1)
}

func (m *MockCustomerService) CheckCustomerExists(ctx context.Context, arg db.CheckCustomerExistsParams) (bool, error) {
	args := m.Called(ctx, arg)
	return args.Get(0).(bool), args.Error(1)
}

// Test data factory
func createTestCustomer(tenantID uuid.UUID) db.Customer {
	return db.Customer{
		ID:            uuid.New(),
		TenantID:      tenantID,
		Name:          "Test Customer",
		ContactPerson: sql.NullString{String: "John Doe", Valid: true},
		Email:         sql.NullString{String: "john@example.com", Valid: true},
		Phone:         sql.NullString{String: "+1234567890", Valid: true},
		Address:       sql.NullString{String: "123 Test St", Valid: true},
		PaymentMode:   sql.NullString{String: "credit", Valid: true},
		IsActive:      sql.NullBool{Bool: true, Valid: true},
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	}
}

func setupTestEcho(tenantID string) *echo.Echo {
	e := echo.New()
	e.Use(func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			c.Set("tenant_id", tenantID)
			return next(c)
		}
	})
	return e
}

func TestCustomerHandler_CreateCustomer(t *testing.T) {
	mockServiceInterface := &MockCustomerService{}
	customerService := &CustomerService{q: mockServiceInterface}
	handler := NewCustomerHandler(customerService)
	tenantID := uuid.New()
	tenantStr := tenantID.String()

	tests := []struct {
		name           string
		tenantID       string
		requestBody    map[string]interface{}
		setupMock      func()
		expectedStatus int
		expectError    bool
	}{
		{
			name:     "successful creation",
			tenantID: tenantStr,
			requestBody: map[string]interface{}{
				"name":           "New Customer",
				"contact_person": "Jane Smith",
				"email":          "jane@example.com",
				"phone":          "+9876543210",
				"address":        "456 New St",
				"payment_mode":   "cash",
			},
			setupMock: func() {
				expectedCustomer := createTestCustomer(tenantID)
				expectedCustomer.Name = "New Customer"
				mockServiceInterface.On("CreateCustomer", mock.Anything, mock.MatchedBy(func(arg db.CreateCustomerParams) bool {
					return arg.Name == "New Customer" && arg.TenantID == tenantID
				})).Return(expectedCustomer, nil)
			},
			expectedStatus: http.StatusCreated,
			expectError:    false,
		},
		{
			name:           "invalid tenant ID",
			tenantID:       "invalid-uuid",
			requestBody:    map[string]interface{}{"name": "Test"},
			setupMock:      func() {},
			expectedStatus: http.StatusUnauthorized,
			expectError:    true,
		},
		{
			name:     "service error",
			tenantID: tenantStr,
			requestBody: map[string]interface{}{
				"name": "Error Customer",
			},
			setupMock: func() {
				mockServiceInterface.On("CreateCustomer", mock.Anything, mock.Anything).
					Return(db.Customer{}, fmt.Errorf("database error"))
			},
			expectedStatus: http.StatusInternalServerError,
			expectError:    true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Setup
			tt.setupMock()
			e := setupTestEcho(tt.tenantID)
			e.POST("/customers", handler.CreateCustomer)

			// Create request
			body, _ := json.Marshal(tt.requestBody)
			req := httptest.NewRequest(http.MethodPost, "/customers", bytes.NewReader(body))
			req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
			rec := httptest.NewRecorder()

			// Execute through Echo router
			e.ServeHTTP(rec, req)

			// Assert
			if tt.expectError {
				assert.NotEqual(t, http.StatusOK, rec.Code)
				assert.NotEqual(t, http.StatusCreated, rec.Code)
			} else {
				assert.Equal(t, tt.expectedStatus, rec.Code)

				var response map[string]interface{}
				err := json.Unmarshal(rec.Body.Bytes(), &response)
				require.NoError(t, err)
				assert.True(t, response["success"].(bool))
			}

			mockServiceInterface.AssertExpectations(t)
		})
	}
}

func TestCustomerHandler_GetCustomer(t *testing.T) {
	mockServiceInterface := &MockCustomerService{}
	customerService := &CustomerService{q: mockServiceInterface}
	handler := NewCustomerHandler(customerService)
	tenantID := uuid.New()
	customerID := uuid.New()

	tests := []struct {
		name           string
		customerID     string
		tenantID       string
		setupMock      func()
		expectedStatus int
		expectError    bool
	}{
		{
			name:       "successful get",
			customerID: customerID.String(),
			tenantID:   tenantID.String(),
			setupMock: func() {
				expectedCustomer := createTestCustomer(tenantID)
				expectedCustomer.ID = customerID
				mockServiceInterface.On("GetCustomerByID", mock.Anything, db.GetCustomerByIDParams{
					ID:       customerID,
					TenantID: tenantID,
				}).Return(expectedCustomer, nil)
			},
			expectedStatus: http.StatusOK,
			expectError:    false,
		},
		{
			name:           "invalid customer ID",
			customerID:     "invalid-uuid",
			tenantID:       tenantID.String(),
			setupMock:      func() {},
			expectedStatus: http.StatusBadRequest,
			expectError:    true,
		},
		{
			name:       "customer not found",
			customerID: customerID.String(),
			tenantID:   tenantID.String(),
			setupMock: func() {
				mockServiceInterface.On("GetCustomerByID", mock.Anything, db.GetCustomerByIDParams{
					ID:       customerID,
					TenantID: tenantID,
				}).Return(db.Customer{}, fmt.Errorf("not found"))
			},
			expectedStatus: http.StatusNotFound,
			expectError:    true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Setup
			tt.setupMock()
			e := setupTestEcho(tt.tenantID)
			e.GET("/customers/:id", handler.GetCustomer)

			// Create request
			req := httptest.NewRequest(http.MethodGet, "/customers/"+tt.customerID, nil)
			rec := httptest.NewRecorder()

			// Execute
			e.ServeHTTP(rec, req)

			// Assert
			if tt.expectError {
				assert.NotEqual(t, http.StatusOK, rec.Code)
			} else {
				assert.Equal(t, tt.expectedStatus, rec.Code)
			}

			mockServiceInterface.AssertExpectations(t)
		})
	}
}

func TestCustomerHandler_ListCustomers(t *testing.T) {
	mockServiceInterface := &MockCustomerService{}
	customerService := &CustomerService{q: mockServiceInterface}
	handler := NewCustomerHandler(customerService)
	tenantID := uuid.New()

	tests := []struct {
		name           string
		queryParams    map[string]string
		setupMock      func()
		expectedStatus int
		expectError    bool
	}{
		{
			name: "successful list with pagination",
			queryParams: map[string]string{
				"page":  "1",
				"limit": "10",
			},
			setupMock: func() {
				customers := []db.Customer{createTestCustomer(tenantID), createTestCustomer(tenantID)}
				mockServiceInterface.On("ListCustomers", mock.Anything, db.ListCustomersParams{
					TenantID: tenantID,
					Limit:    int32(10),
					Offset:   int32(0),
				}).Return(customers, nil)
				mockServiceInterface.On("CountCustomers", mock.Anything, tenantID).
					Return(int64(25), nil)
			},
			expectedStatus: http.StatusOK,
			expectError:    false,
		},
		{
			name:        "default pagination values",
			queryParams: map[string]string{},
			setupMock: func() {
				customers := []db.Customer{}
				mockServiceInterface.On("ListCustomers", mock.Anything, db.ListCustomersParams{
					TenantID: tenantID,
					Limit:    int32(20),
					Offset:   int32(0),
				}).Return(customers, nil)
				mockServiceInterface.On("CountCustomers", mock.Anything, tenantID).
					Return(int64(0), nil)
			},
			expectedStatus: http.StatusOK,
			expectError:    false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Setup
			tt.setupMock()
			e := setupTestEcho(tenantID.String())

			// Create request with query params
			url := "/customers"
			if len(tt.queryParams) > 0 {
				url += "?"
				for k, v := range tt.queryParams {
					url += fmt.Sprintf("%s=%s&", k, v)
				}
			}

			req := httptest.NewRequest(http.MethodGet, url, nil)
			rec := httptest.NewRecorder()
			c := e.NewContext(req, rec)

			// Execute
			err := handler.ListCustomers(c)

			// Assert
			if tt.expectError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
				assert.Equal(t, tt.expectedStatus, rec.Code)

				var response map[string]interface{}
				err = json.Unmarshal(rec.Body.Bytes(), &response)
				require.NoError(t, err)
				assert.True(t, response["success"].(bool))
				assert.Contains(t, response, "pagination")
			}

			mockServiceInterface.AssertExpectations(t)
		})
	}
}

func TestCustomerHandler_SearchCustomers(t *testing.T) {
	mockServiceInterface := &MockCustomerService{}
	customerService := &CustomerService{q: mockServiceInterface}
	handler := NewCustomerHandler(customerService)
	tenantID := uuid.New()

	tests := []struct {
		name           string
		searchQuery    string
		setupMock      func()
		expectedStatus int
		expectError    bool
	}{
		{
			name:        "successful search",
			searchQuery: "test",
			setupMock: func() {
				customers := []db.Customer{createTestCustomer(tenantID)}
				mockServiceInterface.On("SearchCustomers", mock.Anything, db.SearchCustomersParams{
					TenantID: tenantID,
					Name:     "%test%",
					Limit:    int32(20),
					Offset:   int32(0),
				}).Return(customers, nil)
			},
			expectedStatus: http.StatusOK,
			expectError:    false,
		},
		{
			name:           "missing search query",
			searchQuery:    "",
			setupMock:      func() {},
			expectedStatus: http.StatusBadRequest,
			expectError:    true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Setup
			tt.setupMock()
			e := setupTestEcho(tenantID.String())

			// Create request
			url := "/customers/search"
			if tt.searchQuery != "" {
				url += "?q=" + tt.searchQuery
			}

			req := httptest.NewRequest(http.MethodGet, url, nil)
			rec := httptest.NewRecorder()
			c := e.NewContext(req, rec)

			// Execute
			err := handler.SearchCustomers(c)

			// Assert
			if tt.expectError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
				assert.Equal(t, tt.expectedStatus, rec.Code)

				var response map[string]interface{}
				err = json.Unmarshal(rec.Body.Bytes(), &response)
				require.NoError(t, err)
				assert.True(t, response["success"].(bool))
				assert.Equal(t, tt.searchQuery, response["query"])
			}

			mockServiceInterface.AssertExpectations(t)
		})
	}
}

func TestCustomerHandler_UpdateCustomer(t *testing.T) {
	mockServiceInterface := &MockCustomerService{}
	customerService := &CustomerService{q: mockServiceInterface}
	handler := NewCustomerHandler(customerService)
	tenantID := uuid.New()
	customerID := uuid.New()

	tests := []struct {
		name           string
		customerID     string
		tenantID       string
		requestBody    map[string]interface{}
		setupMock      func()
		expectedStatus int
		expectError    bool
	}{
		{
			name:       "successful update",
			customerID: customerID.String(),
			tenantID:   tenantID.String(),
			requestBody: map[string]interface{}{
				"name":           "Updated Customer",
				"contact_person": "Updated Contact",
				"email":          "updated@example.com",
				"phone":          "+1111111111",
				"address":        "Updated Address",
				"payment_mode":   "updated_mode",
				"is_active":      true,
			},
			setupMock: func() {
				updatedCustomer := createTestCustomer(tenantID)
				updatedCustomer.ID = customerID
				updatedCustomer.Name = "Updated Customer"
				mockServiceInterface.On("UpdateCustomer", mock.Anything, mock.MatchedBy(func(arg db.UpdateCustomerParams) bool {
					return arg.ID == customerID && arg.Name == "Updated Customer"
				})).Return(updatedCustomer, nil)
			},
			expectedStatus: http.StatusOK,
			expectError:    false,
		},
		{
			name:           "invalid customer ID",
			customerID:     "invalid-uuid",
			tenantID:       tenantID.String(),
			requestBody:    map[string]interface{}{"name": "Test"},
			setupMock:      func() {},
			expectedStatus: http.StatusBadRequest,
			expectError:    true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Setup
			tt.setupMock()
			e := setupTestEcho(tt.tenantID)

			// Create request
			body, _ := json.Marshal(tt.requestBody)
			req := httptest.NewRequest(http.MethodPut, "/customers/"+tt.customerID, bytes.NewReader(body))
			req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
			rec := httptest.NewRecorder()
			c := e.NewContext(req, rec)
			c.SetParamNames("id")
			c.SetParamValues(tt.customerID)

			// Execute
			err := handler.UpdateCustomer(c)

			// Assert
			if tt.expectError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
				assert.Equal(t, tt.expectedStatus, rec.Code)
			}

			mockServiceInterface.AssertExpectations(t)
		})
	}
}

func TestCustomerHandler_DeleteCustomer(t *testing.T) {
	mockServiceInterface := &MockCustomerService{}
	customerService := &CustomerService{q: mockServiceInterface}
	handler := NewCustomerHandler(customerService)
	tenantID := uuid.New()
	customerID := uuid.New()

	tests := []struct {
		name           string
		customerID     string
		tenantID       string
		setupMock      func()
		expectedStatus int
		expectError    bool
	}{
		{
			name:       "successful delete",
			customerID: customerID.String(),
			tenantID:   tenantID.String(),
			setupMock: func() {
				mockServiceInterface.On("DeactivateCustomer", mock.Anything, db.DeactivateCustomerParams{
					ID:       customerID,
					TenantID: tenantID,
				}).Return(nil)
			},
			expectedStatus: http.StatusOK,
			expectError:    false,
		},
		{
			name:           "invalid customer ID",
			customerID:     "invalid-uuid",
			tenantID:       tenantID.String(),
			setupMock:      func() {},
			expectedStatus: http.StatusBadRequest,
			expectError:    true,
		},
		{
			name:       "service error",
			customerID: customerID.String(),
			tenantID:   tenantID.String(),
			setupMock: func() {
				mockServiceInterface.On("DeactivateCustomer", mock.Anything, db.DeactivateCustomerParams{
					ID:       customerID,
					TenantID: tenantID,
				}).Return(fmt.Errorf("delete failed"))
			},
			expectedStatus: http.StatusInternalServerError,
			expectError:    true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Setup
			tt.setupMock()
			e := setupTestEcho(tt.tenantID)

			// Create request  
			req := httptest.NewRequest(http.MethodDelete, "/customers/"+tt.customerID, nil)
			rec := httptest.NewRecorder()
			c := e.NewContext(req, rec)
			c.SetParamNames("id")
			c.SetParamValues(tt.customerID)

			// Execute
			err := handler.DeleteCustomer(c)

			// Assert
			if tt.expectError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
				assert.Equal(t, tt.expectedStatus, rec.Code)

				var response map[string]interface{}
				err = json.Unmarshal(rec.Body.Bytes(), &response)
				require.NoError(t, err)
				assert.True(t, response["success"].(bool))
			}

			mockServiceInterface.AssertExpectations(t)
		})
	}
}

func TestCustomerHandler_ListActiveCustomers(t *testing.T) {
	mockServiceInterface := &MockCustomerService{}
	customerService := &CustomerService{q: mockServiceInterface}
	handler := NewCustomerHandler(customerService)
	tenantID := uuid.New()

	t.Run("successful list active customers", func(t *testing.T) {
		// Setup
		activeCustomers := []db.Customer{
			{ID: uuid.New(), TenantID: tenantID, Name: "Active Customer 1", IsActive: sql.NullBool{Bool: true, Valid: true}},
			{ID: uuid.New(), TenantID: tenantID, Name: "Active Customer 2", IsActive: sql.NullBool{Bool: true, Valid: true}},
		}
		mockServiceInterface.On("ListActiveCustomers", mock.Anything, db.ListActiveCustomersParams{
			TenantID: tenantID,
			Limit:    int32(20),
			Offset:   int32(0),
		}).Return(activeCustomers, nil)

		e := setupTestEcho(tenantID.String())

		// Create request
		req := httptest.NewRequest(http.MethodGet, "/customers/active", nil)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		// Execute
		err := handler.ListActiveCustomers(c)

		// Assert
		assert.NoError(t, err)
		assert.Equal(t, http.StatusOK, rec.Code)

		var response map[string]interface{}
		err = json.Unmarshal(rec.Body.Bytes(), &response)
		require.NoError(t, err)
		assert.True(t, response["success"].(bool))
		assert.Len(t, response["data"], 2)

		mockServiceInterface.AssertExpectations(t)
	})
}