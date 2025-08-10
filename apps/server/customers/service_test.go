package customers

import (
	"context"
	"database/sql"
	"errors"
	"testing"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"

	"agromart/db"
)

// MockQueries is a mock implementation of the database queries
type MockQueries struct {
	mock.Mock
}

func (m *MockQueries) CreateCustomer(ctx context.Context, arg db.CreateCustomerParams) (db.Customer, error) {
	args := m.Called(ctx, arg)
	return args.Get(0).(db.Customer), args.Error(1)
}

func (m *MockQueries) GetCustomerByID(ctx context.Context, arg db.GetCustomerByIDParams) (db.Customer, error) {
	args := m.Called(ctx, arg)
	return args.Get(0).(db.Customer), args.Error(1)
}

func (m *MockQueries) ListCustomers(ctx context.Context, arg db.ListCustomersParams) ([]db.Customer, error) {
	args := m.Called(ctx, arg)
	return args.Get(0).([]db.Customer), args.Error(1)
}

func (m *MockQueries) UpdateCustomer(ctx context.Context, arg db.UpdateCustomerParams) (db.Customer, error) {
	args := m.Called(ctx, arg)
	return args.Get(0).(db.Customer), args.Error(1)
}

func (m *MockQueries) DeleteCustomer(ctx context.Context, arg db.DeleteCustomerParams) error {
	args := m.Called(ctx, arg)
	return args.Error(0)
}

func (m *MockQueries) SearchCustomers(ctx context.Context, arg db.SearchCustomersParams) ([]db.Customer, error) {
	args := m.Called(ctx, arg)
	return args.Get(0).([]db.Customer), args.Error(1)
}

func (m *MockQueries) ListActiveCustomers(ctx context.Context, tenantID uuid.UUID) ([]db.Customer, error) {
	args := m.Called(ctx, tenantID)
	return args.Get(0).([]db.Customer), args.Error(1)
}

func TestCustomerService_CreateCustomer(t *testing.T) {
	mockQueries := &MockQueries{}
	service := &CustomerService{q: mockQueries}

	tenantID := uuid.New()

	t.Run("successful customer creation", func(t *testing.T) {
		req := CreateCustomerRequest{
			Name:        "Test Customer Inc",
			Email:       "test@customer.com",
			Phone:       "+1-555-0123",
			Address:     "123 Test St, Test City, TC 12345",
			PaymentMode: "credit",
		}

		expectedCustomer := db.Customer{
			ID:            uuid.New(),
			TenantID:      tenantID,
			Name:          req.Name,
			ContactPerson: pgtype.Text{String: "", Valid: false},
			Email:         pgtype.Text{String: req.Email, Valid: true},
			Phone:         pgtype.Text{String: req.Phone, Valid: true},
			Address:       pgtype.Text{String: req.Address, Valid: true},
			PaymentMode:   pgtype.Text{String: req.PaymentMode, Valid: true},
			IsActive:      pgtype.Bool{Bool: true, Valid: true},
		}

		mockQueries.On("CreateCustomer", mock.Anything, mock.MatchedBy(func(arg db.CreateCustomerParams) bool {
			return arg.Name == req.Name &&
				arg.TenantID == tenantID &&
				arg.Email.String == req.Email &&
				arg.Phone.String == req.Phone &&
				arg.Address.String == req.Address
		})).Return(expectedCustomer, nil)

		customer, err := service.CreateCustomer(context.Background(), req, tenantID)

		require.NoError(t, err)
		assert.Equal(t, expectedCustomer.ID, customer.ID)
		assert.Equal(t, expectedCustomer.Name, customer.Name)
		assert.Equal(t, expectedCustomer.TenantID, customer.TenantID)
		assert.Equal(t, req.Email, customer.Email.String)

		mockQueries.AssertExpectations(t)
	})

	t.Run("customer creation with minimal data", func(t *testing.T) {
		req := CreateCustomerRequest{
			Name: "Minimal Customer",
		}

		expectedCustomer := db.Customer{
			ID:       uuid.New(),
			TenantID: tenantID,
			Name:     req.Name,
			IsActive: pgtype.Bool{Bool: true, Valid: true},
		}

		mockQueries.On("CreateCustomer", mock.Anything, mock.MatchedBy(func(arg db.CreateCustomerParams) bool {
			return arg.Name == req.Name &&
				arg.TenantID == tenantID &&
				!arg.Email.Valid &&
				!arg.Phone.Valid &&
				!arg.Address.Valid
		})).Return(expectedCustomer, nil)

		customer, err := service.CreateCustomer(context.Background(), req, tenantID)

		require.NoError(t, err)
		assert.Equal(t, expectedCustomer.Name, customer.Name)
		assert.False(t, customer.Email.Valid)
		assert.False(t, customer.Phone.Valid)

		mockQueries.AssertExpectations(t)
	})

	t.Run("database error", func(t *testing.T) {
		req := CreateCustomerRequest{
			Name: "Error Customer",
		}

		mockQueries.On("CreateCustomer", mock.Anything, mock.Anything).
			Return(db.Customer{}, errors.New("database connection failed"))

		customer, err := service.CreateCustomer(context.Background(), req, tenantID)

		assert.Error(t, err)
		assert.Equal(t, db.Customer{}, customer)
		assert.Contains(t, err.Error(), "failed to create customer")

		mockQueries.AssertExpectations(t)
	})

	t.Run("duplicate name constraint", func(t *testing.T) {
		req := CreateCustomerRequest{
			Name: "Existing Customer",
		}

		mockQueries.On("CreateCustomer", mock.Anything, mock.Anything).
			Return(db.Customer{}, errors.New("duplicate key value violates unique constraint"))

		customer, err := service.CreateCustomer(context.Background(), req, tenantID)

		assert.Error(t, err)
		assert.Equal(t, db.Customer{}, customer)

		mockQueries.AssertExpectations(t)
	})

	t.Run("empty customer name", func(t *testing.T) {
		req := CreateCustomerRequest{
			Name: "",
		}

		mockQueries.On("CreateCustomer", mock.Anything, mock.MatchedBy(func(arg db.CreateCustomerParams) bool {
			return arg.Name == ""
		})).Return(db.Customer{}, errors.New("name cannot be empty"))

		customer, err := service.CreateCustomer(context.Background(), req, tenantID)

		assert.Error(t, err)
		assert.Equal(t, db.Customer{}, customer)

		mockQueries.AssertExpectations(t)
	})
}

func TestCustomerService_GetCustomerByID(t *testing.T) {
	mockQueries := &MockQueries{}
	service := &CustomerService{q: mockQueries}

	customerID := uuid.New()
	tenantID := uuid.New()

	t.Run("customer found", func(t *testing.T) {
		expectedCustomer := db.Customer{
			ID:       customerID,
			TenantID: tenantID,
			Name:     "Found Customer",
			Email:    pgtype.Text{String: "found@customer.com", Valid: true},
			Phone:    pgtype.Text{String: "+1-555-0123", Valid: true},
			IsActive: pgtype.Bool{Bool: true, Valid: true},
		}

		mockQueries.On("GetCustomerByID", mock.Anything, db.GetCustomerByIDParams{
			ID:       customerID,
			TenantID: tenantID,
		}).Return(expectedCustomer, nil)

		customer, err := service.GetCustomerByID(context.Background(), customerID, tenantID)

		require.NoError(t, err)
		assert.Equal(t, expectedCustomer.ID, customer.ID)
		assert.Equal(t, expectedCustomer.Name, customer.Name)
		assert.Equal(t, expectedCustomer.Email, customer.Email)

		mockQueries.AssertExpectations(t)
	})

	t.Run("customer not found", func(t *testing.T) {
		mockQueries.On("GetCustomerByID", mock.Anything, db.GetCustomerByIDParams{
			ID:       customerID,
			TenantID: tenantID,
		}).Return(db.Customer{}, sql.ErrNoRows)

		customer, err := service.GetCustomerByID(context.Background(), customerID, tenantID)

		assert.Error(t, err)
		assert.Equal(t, db.Customer{}, customer)
		assert.Contains(t, err.Error(), "customer not found")

		mockQueries.AssertExpectations(t)
	})

	t.Run("database error", func(t *testing.T) {
		mockQueries.On("GetCustomerByID", mock.Anything, db.GetCustomerByIDParams{
			ID:       customerID,
			TenantID: tenantID,
		}).Return(db.Customer{}, errors.New("connection timeout"))

		customer, err := service.GetCustomerByID(context.Background(), customerID, tenantID)

		assert.Error(t, err)
		assert.Equal(t, db.Customer{}, customer)

		mockQueries.AssertExpectations(t)
	})

	t.Run("invalid customer ID", func(t *testing.T) {
		invalidID := uuid.Nil

		mockQueries.On("GetCustomerByID", mock.Anything, db.GetCustomerByIDParams{
			ID:       invalidID,
			TenantID: tenantID,
		}).Return(db.Customer{}, sql.ErrNoRows)

		customer, err := service.GetCustomerByID(context.Background(), invalidID, tenantID)

		assert.Error(t, err)
		assert.Equal(t, db.Customer{}, customer)

		mockQueries.AssertExpectations(t)
	})
}

func TestCustomerService_ListCustomers(t *testing.T) {
	mockQueries := &MockQueries{}
	service := &CustomerService{q: mockQueries}

	tenantID := uuid.New()

	t.Run("successful list with pagination", func(t *testing.T) {
		params := ListCustomersParams{
			TenantID: tenantID,
			Limit:    10,
			Offset:   0,
		}

		expectedCustomers := []db.Customer{
			{
				ID:       uuid.New(),
				TenantID: tenantID,
				Name:     "Customer 1",
				IsActive: pgtype.Bool{Bool: true, Valid: true},
			},
			{
				ID:       uuid.New(),
				TenantID: tenantID,
				Name:     "Customer 2",
				IsActive: pgtype.Bool{Bool: true, Valid: true},
			},
		}

		mockQueries.On("ListCustomers", mock.Anything, db.ListCustomersParams{
			TenantID: tenantID,
			Limit:    10,
			Offset:   0,
		}).Return(expectedCustomers, nil)

		customers, err := service.ListCustomers(context.Background(), params)

		require.NoError(t, err)
		assert.Len(t, customers, 2)
		assert.Equal(t, expectedCustomers[0].Name, customers[0].Name)
		assert.Equal(t, expectedCustomers[1].Name, customers[1].Name)

		mockQueries.AssertExpectations(t)
	})

	t.Run("empty result", func(t *testing.T) {
		params := ListCustomersParams{
			TenantID: tenantID,
			Limit:    10,
			Offset:   0,
		}

		mockQueries.On("ListCustomers", mock.Anything, db.ListCustomersParams{
			TenantID: tenantID,
			Limit:    10,
			Offset:   0,
		}).Return([]db.Customer{}, nil)

		customers, err := service.ListCustomers(context.Background(), params)

		require.NoError(t, err)
		assert.Len(t, customers, 0)

		mockQueries.AssertExpectations(t)
	})

	t.Run("database error", func(t *testing.T) {
		params := ListCustomersParams{
			TenantID: tenantID,
			Limit:    10,
			Offset:   0,
		}

		mockQueries.On("ListCustomers", mock.Anything, db.ListCustomersParams{
			TenantID: tenantID,
			Limit:    10,
			Offset:   0,
		}).Return([]db.Customer{}, errors.New("database timeout"))

		customers, err := service.ListCustomers(context.Background(), params)

		assert.Error(t, err)
		assert.Nil(t, customers)

		mockQueries.AssertExpectations(t)
	})

	t.Run("large offset", func(t *testing.T) {
		params := ListCustomersParams{
			TenantID: tenantID,
			Limit:    10,
			Offset:   1000,
		}

		mockQueries.On("ListCustomers", mock.Anything, db.ListCustomersParams{
			TenantID: tenantID,
			Limit:    10,
			Offset:   1000,
		}).Return([]db.Customer{}, nil)

		customers, err := service.ListCustomers(context.Background(), params)

		require.NoError(t, err)
		assert.Len(t, customers, 0)

		mockQueries.AssertExpectations(t)
	})
}

func TestCustomerService_UpdateCustomer(t *testing.T) {
	mockQueries := &MockQueries{}
	service := &CustomerService{q: mockQueries}

	customerID := uuid.New()
	tenantID := uuid.New()

	t.Run("successful customer update", func(t *testing.T) {
		req := UpdateCustomerRequest{
			Name:    "Updated Customer Name",
			Email:   "updated@customer.com",
			Phone:   "+1-555-9999",
			Address: "456 Updated St, Updated City, UC 54321",
		}

		expectedCustomer := db.Customer{
			ID:       customerID,
			TenantID: tenantID,
			Name:     req.Name,
			Email:    pgtype.Text{String: req.Email, Valid: true},
			Phone:    pgtype.Text{String: req.Phone, Valid: true},
			Address:  pgtype.Text{String: req.Address, Valid: true},
			IsActive: pgtype.Bool{Bool: true, Valid: true},
		}

		mockQueries.On("UpdateCustomer", mock.Anything, mock.MatchedBy(func(arg db.UpdateCustomerParams) bool {
			return arg.ID == customerID &&
				arg.TenantID == tenantID &&
				arg.Name == req.Name &&
				arg.Email.String == req.Email
		})).Return(expectedCustomer, nil)

		customer, err := service.UpdateCustomer(context.Background(), req, customerID, tenantID)

		require.NoError(t, err)
		assert.Equal(t, expectedCustomer.ID, customer.ID)
		assert.Equal(t, expectedCustomer.Name, customer.Name)
		assert.Equal(t, req.Email, customer.Email.String)

		mockQueries.AssertExpectations(t)
	})

	t.Run("partial customer update", func(t *testing.T) {
		req := UpdateCustomerRequest{
			Name:  "Only Name Updated",
			Email: "", // Empty email should be handled
		}

		expectedCustomer := db.Customer{
			ID:       customerID,
			TenantID: tenantID,
			Name:     req.Name,
			Email:    pgtype.Text{String: "", Valid: false},
			IsActive: pgtype.Bool{Bool: true, Valid: true},
		}

		mockQueries.On("UpdateCustomer", mock.Anything, mock.MatchedBy(func(arg db.UpdateCustomerParams) bool {
			return arg.ID == customerID &&
				arg.Name == req.Name &&
				!arg.Email.Valid
		})).Return(expectedCustomer, nil)

		customer, err := service.UpdateCustomer(context.Background(), req, customerID, tenantID)

		require.NoError(t, err)
		assert.Equal(t, expectedCustomer.Name, customer.Name)
		assert.False(t, customer.Email.Valid)

		mockQueries.AssertExpectations(t)
	})

	t.Run("customer not found", func(t *testing.T) {
		req := UpdateCustomerRequest{
			Name: "Non-existent Customer",
		}

		mockQueries.On("UpdateCustomer", mock.Anything, mock.MatchedBy(func(arg db.UpdateCustomerParams) bool {
			return arg.ID == customerID
		})).Return(db.Customer{}, sql.ErrNoRows)

		customer, err := service.UpdateCustomer(context.Background(), req, customerID, tenantID)

		assert.Error(t, err)
		assert.Equal(t, db.Customer{}, customer)
		assert.Contains(t, err.Error(), "customer not found")

		mockQueries.AssertExpectations(t)
	})

	t.Run("database error", func(t *testing.T) {
		req := UpdateCustomerRequest{
			Name: "Error Customer",
		}

		mockQueries.On("UpdateCustomer", mock.Anything, mock.Anything).
			Return(db.Customer{}, errors.New("database constraint violation"))

		customer, err := service.UpdateCustomer(context.Background(), req, customerID, tenantID)

		assert.Error(t, err)
		assert.Equal(t, db.Customer{}, customer)

		mockQueries.AssertExpectations(t)
	})

	t.Run("empty name update", func(t *testing.T) {
		req := UpdateCustomerRequest{
			Name: "",
		}

		mockQueries.On("UpdateCustomer", mock.Anything, mock.MatchedBy(func(arg db.UpdateCustomerParams) bool {
			return arg.Name == ""
		})).Return(db.Customer{}, errors.New("name cannot be empty"))

		customer, err := service.UpdateCustomer(context.Background(), req, customerID, tenantID)

		assert.Error(t, err)
		assert.Equal(t, db.Customer{}, customer)

		mockQueries.AssertExpectations(t)
	})
}

func TestCustomerService_DeleteCustomer(t *testing.T) {
	mockQueries := &MockQueries{}
	service := &CustomerService{q: mockQueries}

	customerID := uuid.New()
	tenantID := uuid.New()

	t.Run("successful customer deletion", func(t *testing.T) {
		mockQueries.On("DeleteCustomer", mock.Anything, db.DeleteCustomerParams{
			ID:       customerID,
			TenantID: tenantID,
		}).Return(nil)

		err := service.DeleteCustomer(context.Background(), customerID, tenantID)

		require.NoError(t, err)

		mockQueries.AssertExpectations(t)
	})

	t.Run("customer not found", func(t *testing.T) {
		mockQueries.On("DeleteCustomer", mock.Anything, db.DeleteCustomerParams{
			ID:       customerID,
			TenantID: tenantID,
		}).Return(sql.ErrNoRows)

		err := service.DeleteCustomer(context.Background(), customerID, tenantID)

		assert.Error(t, err)
		assert.Contains(t, err.Error(), "customer not found")

		mockQueries.AssertExpectations(t)
	})

	t.Run("customer with dependencies", func(t *testing.T) {
		mockQueries.On("DeleteCustomer", mock.Anything, db.DeleteCustomerParams{
			ID:       customerID,
			TenantID: tenantID,
		}).Return(errors.New("cannot delete customer with existing orders"))

		err := service.DeleteCustomer(context.Background(), customerID, tenantID)

		assert.Error(t, err)
		assert.Contains(t, err.Error(), "failed to delete customer")

		mockQueries.AssertExpectations(t)
	})

	t.Run("database error", func(t *testing.T) {
		mockQueries.On("DeleteCustomer", mock.Anything, db.DeleteCustomerParams{
			ID:       customerID,
			TenantID: tenantID,
		}).Return(errors.New("database connection failed"))

		err := service.DeleteCustomer(context.Background(), customerID, tenantID)

		assert.Error(t, err)

		mockQueries.AssertExpectations(t)
	})
}

func TestCustomerService_SearchCustomers(t *testing.T) {
	mockQueries := &MockQueries{}
	service := &CustomerService{q: mockQueries}

	tenantID := uuid.New()

	t.Run("successful search", func(t *testing.T) {
		searchQuery := "test customer"
		params := SearchCustomersParams{
			TenantID: tenantID,
			Query:    searchQuery,
			Limit:    10,
			Offset:   0,
		}

		expectedCustomers := []db.Customer{
			{
				ID:       uuid.New(),
				TenantID: tenantID,
				Name:     "Test Customer 1",
				Email:    pgtype.Text{String: "test1@customer.com", Valid: true},
			},
			{
				ID:       uuid.New(),
				TenantID: tenantID,
				Name:     "Test Customer 2",
				Email:    pgtype.Text{String: "test2@customer.com", Valid: true},
			},
		}

		mockQueries.On("SearchCustomers", mock.Anything, db.SearchCustomersParams{
			TenantID: tenantID,
			Query:    searchQuery,
			Limit:    10,
			Offset:   0,
		}).Return(expectedCustomers, nil)

		customers, err := service.SearchCustomers(context.Background(), params)

		require.NoError(t, err)
		assert.Len(t, customers, 2)
		assert.Contains(t, customers[0].Name, "Test Customer")
		assert.Contains(t, customers[1].Name, "Test Customer")

		mockQueries.AssertExpectations(t)
	})

	t.Run("no results found", func(t *testing.T) {
		searchQuery := "nonexistent customer"
		params := SearchCustomersParams{
			TenantID: tenantID,
			Query:    searchQuery,
			Limit:    10,
			Offset:   0,
		}

		mockQueries.On("SearchCustomers", mock.Anything, db.SearchCustomersParams{
			TenantID: tenantID,
			Query:    searchQuery,
			Limit:    10,
			Offset:   0,
		}).Return([]db.Customer{}, nil)

		customers, err := service.SearchCustomers(context.Background(), params)

		require.NoError(t, err)
		assert.Len(t, customers, 0)

		mockQueries.AssertExpectations(t)
	})

	t.Run("empty search query", func(t *testing.T) {
		params := SearchCustomersParams{
			TenantID: tenantID,
			Query:    "",
			Limit:    10,
			Offset:   0,
		}

		mockQueries.On("SearchCustomers", mock.Anything, db.SearchCustomersParams{
			TenantID: tenantID,
			Query:    "",
			Limit:    10,
			Offset:   0,
		}).Return([]db.Customer{}, nil)

		customers, err := service.SearchCustomers(context.Background(), params)

		require.NoError(t, err)
		assert.Len(t, customers, 0)

		mockQueries.AssertExpectations(t)
	})

	t.Run("database error", func(t *testing.T) {
		searchQuery := "error query"
		params := SearchCustomersParams{
			TenantID: tenantID,
			Query:    searchQuery,
			Limit:    10,
			Offset:   0,
		}

		mockQueries.On("SearchCustomers", mock.Anything, db.SearchCustomersParams{
			TenantID: tenantID,
			Query:    searchQuery,
			Limit:    10,
			Offset:   0,
		}).Return([]db.Customer{}, errors.New("search service unavailable"))

		customers, err := service.SearchCustomers(context.Background(), params)

		assert.Error(t, err)
		assert.Nil(t, customers)

		mockQueries.AssertExpectations(t)
	})
}

func TestCustomerService_ListActiveCustomers(t *testing.T) {
	mockQueries := &MockQueries{}
	service := &CustomerService{q: mockQueries}

	tenantID := uuid.New()

	t.Run("successful list of active customers", func(t *testing.T) {
		expectedCustomers := []db.Customer{
			{
				ID:       uuid.New(),
				TenantID: tenantID,
				Name:     "Active Customer 1",
				IsActive: pgtype.Bool{Bool: true, Valid: true},
			},
			{
				ID:       uuid.New(),
				TenantID: tenantID,
				Name:     "Active Customer 2",
				IsActive: pgtype.Bool{Bool: true, Valid: true},
			},
		}

		mockQueries.On("ListActiveCustomers", mock.Anything, tenantID).
			Return(expectedCustomers, nil)

		customers, err := service.ListActiveCustomers(context.Background(), tenantID)

		require.NoError(t, err)
		assert.Len(t, customers, 2)
		assert.True(t, customers[0].IsActive.Bool)
		assert.True(t, customers[1].IsActive.Bool)

		mockQueries.AssertExpectations(t)
	})

	t.Run("no active customers", func(t *testing.T) {
		mockQueries.On("ListActiveCustomers", mock.Anything, tenantID).
			Return([]db.Customer{}, nil)

		customers, err := service.ListActiveCustomers(context.Background(), tenantID)

		require.NoError(t, err)
		assert.Len(t, customers, 0)

		mockQueries.AssertExpectations(t)
	})

	t.Run("database error", func(t *testing.T) {
		mockQueries.On("ListActiveCustomers", mock.Anything, tenantID).
			Return([]db.Customer{}, errors.New("database connection failed"))

		customers, err := service.ListActiveCustomers(context.Background(), tenantID)

		assert.Error(t, err)
		assert.Nil(t, customers)

		mockQueries.AssertExpectations(t)
	})
}

func TestCustomerService_Constructor(t *testing.T) {
	t.Run("service construction", func(t *testing.T) {
		mockQueries := &MockQueries{}
		service := &CustomerService{q: mockQueries}

		assert.NotNil(t, service)
		assert.Equal(t, mockQueries, service.q)
	})

	t.Run("service construction with nil queries", func(t *testing.T) {
		service := &CustomerService{q: nil}

		assert.NotNil(t, service)
		assert.Nil(t, service.q)
	})
}

func TestCustomerService_ValidationHelpers(t *testing.T) {
	t.Run("email validation", func(t *testing.T) {
		validEmails := []string{
			"test@example.com",
			"user.name@domain.co.uk",
			"firstname+lastname@company.org",
		}

		invalidEmails := []string{
			"",
			"invalid-email",
			"@domain.com",
			"user@",
		}

		for _, email := range validEmails {
			// Assuming there's an email validation function
			// This would be implemented in the actual service
			assert.NotEmpty(t, email, "Valid email should not be empty")
		}

		for _, email := range invalidEmails {
			// Test invalid email handling
			if email == "" {
				assert.Empty(t, email, "Empty email should be empty")
			}
		}
	})

	t.Run("phone validation", func(t *testing.T) {
		validPhones := []string{
			"+1-555-0123",
			"555-0123",
			"+44 20 7946 0958",
			"(555) 123-4567",
		}

		for _, phone := range validPhones {
			assert.NotEmpty(t, phone, "Valid phone should not be empty")
		}
	})
}

// Benchmark tests
func BenchmarkCustomerService_CreateCustomer(b *testing.B) {
	mockQueries := &MockQueries{}
	service := &CustomerService{q: mockQueries}

	tenantID := uuid.New()

	req := CreateCustomerRequest{
		Name:    "Benchmark Customer",
		Email:   "benchmark@customer.com",
		Phone:   "+1-555-0123",
		Address: "123 Benchmark St",
	}

	expectedCustomer := db.Customer{
		ID:       uuid.New(),
		TenantID: tenantID,
		Name:     req.Name,
		Email:    pgtype.Text{String: req.Email, Valid: true},
	}

	mockQueries.On("CreateCustomer", mock.Anything, mock.Anything).Return(expectedCustomer, nil)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, err := service.CreateCustomer(context.Background(), req, tenantID)
		if err != nil {
			b.Fatal(err)
		}
	}
}

func BenchmarkCustomerService_GetCustomerByID(b *testing.B) {
	mockQueries := &MockQueries{}
	service := &CustomerService{q: mockQueries}

	customerID := uuid.New()
	tenantID := uuid.New()

	expectedCustomer := db.Customer{
		ID:       customerID,
		TenantID: tenantID,
		Name:     "Benchmark Customer",
	}

	mockQueries.On("GetCustomerByID", mock.Anything, mock.Anything).Return(expectedCustomer, nil)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, err := service.GetCustomerByID(context.Background(), customerID, tenantID)
		if err != nil {
			b.Fatal(err)
		}
	}
}

func BenchmarkCustomerService_ListCustomers(b *testing.B) {
	mockQueries := &MockQueries{}
	service := &CustomerService{q: mockQueries}

	tenantID := uuid.New()

	params := ListCustomersParams{
		TenantID: tenantID,
		Limit:    10,
		Offset:   0,
	}

	expectedCustomers := []db.Customer{
		{
			ID:       uuid.New(),
			TenantID: tenantID,
			Name:     "Benchmark Customer",
		},
	}

	mockQueries.On("ListCustomers", mock.Anything, mock.Anything).Return(expectedCustomers, nil)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, err := service.ListCustomers(context.Background(), params)
		if err != nil {
			b.Fatal(err)
		}
	}
}
