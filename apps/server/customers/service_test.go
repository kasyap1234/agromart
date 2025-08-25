package customers

import (
	"context"
	"database/sql"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"

	"agromart2/db"
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

func (m *MockQueries) ListActiveCustomers(ctx context.Context, arg db.ListActiveCustomersParams) ([]db.Customer, error) {
	args := m.Called(ctx, arg)
	return args.Get(0).([]db.Customer), args.Error(1)
}

func (m *MockQueries) UpdateCustomer(ctx context.Context, arg db.UpdateCustomerParams) (db.Customer, error) {
	args := m.Called(ctx, arg)
	return args.Get(0).(db.Customer), args.Error(1)
}

func (m *MockQueries) DeactivateCustomer(ctx context.Context, arg db.DeactivateCustomerParams) error {
	args := m.Called(ctx, arg)
	return args.Error(0)
}

func (m *MockQueries) SearchCustomers(ctx context.Context, arg db.SearchCustomersParams) ([]db.Customer, error) {
	args := m.Called(ctx, arg)
	return args.Get(0).([]db.Customer), args.Error(1)
}

func (m *MockQueries) CountCustomers(ctx context.Context, tenantID uuid.UUID) (int64, error) {
	args := m.Called(ctx, tenantID)
	return args.Get(0).(int64), args.Error(1)
}

func (m *MockQueries) CheckCustomerExists(ctx context.Context, arg db.CheckCustomerExistsParams) (bool, error) {
	args := m.Called(ctx, arg)
	return args.Get(0).(bool), args.Error(1)
}

func TestCustomerService_CreateCustomer(t *testing.T) {
	mockQueries := &MockQueries{}
	service := &CustomerService{q: mockQueries}

	tenantID := uuid.New()

	t.Run("successful customer creation", func(t *testing.T) {
		req := CreateCustomerParams{
			TenantID:      tenantID,
			Name:          "Test Customer Inc",
			Email:         "test@customer.com",
			Phone:         "+1-555-0123",
			Address:       "123 Test St, Test City, TC 12345",
			PaymentMode:   "credit",
			ContactPerson: "John Doe",
		}

		expectedCustomer := db.Customer{
			ID:            uuid.New(),
			TenantID:      tenantID,
			Name:          req.Name,
			ContactPerson: sql.NullString{String: req.ContactPerson, Valid: true},
			Email:         sql.NullString{String: req.Email, Valid: true},
			Phone:         sql.NullString{String: req.Phone, Valid: true},
			Address:       sql.NullString{String: req.Address, Valid: true},
			PaymentMode:   sql.NullString{String: req.PaymentMode, Valid: true},
			IsActive:      sql.NullBool{Bool: true, Valid: true},
			CreatedAt:     time.Now(),
			UpdatedAt:     time.Now(),
		}

		mockQueries.On("CreateCustomer", mock.Anything, mock.MatchedBy(func(arg db.CreateCustomerParams) bool {
			return arg.Name == req.Name &&
				arg.TenantID == tenantID &&
				arg.Email.String == req.Email &&
				arg.Phone.String == req.Phone &&
				arg.Address.String == req.Address
		})).Return(expectedCustomer, nil)

		customer, err := service.CreateCustomer(context.Background(), req)

		require.NoError(t, err)
		assert.Equal(t, expectedCustomer.ID, customer.ID)
		assert.Equal(t, expectedCustomer.Name, customer.Name)
		assert.Equal(t, expectedCustomer.TenantID, customer.TenantID)
		assert.Equal(t, req.Email, customer.Email.String)

		mockQueries.AssertExpectations(t)
	})

	t.Run("customer creation with minimal data", func(t *testing.T) {
		req := CreateCustomerParams{
			TenantID: tenantID,
			Name:     "Minimal Customer",
		}

		expectedCustomer := db.Customer{
			ID:        uuid.New(),
			TenantID:  tenantID,
			Name:      req.Name,
			IsActive:  sql.NullBool{Bool: true, Valid: true},
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		}

		mockQueries.On("CreateCustomer", mock.Anything, mock.MatchedBy(func(arg db.CreateCustomerParams) bool {
			return arg.Name == req.Name &&
				arg.TenantID == tenantID &&
				!arg.Email.Valid &&
				!arg.Phone.Valid &&
				!arg.Address.Valid
		})).Return(expectedCustomer, nil)

		customer, err := service.CreateCustomer(context.Background(), req)

		require.NoError(t, err)
		assert.Equal(t, expectedCustomer.Name, customer.Name)
		assert.False(t, customer.Email.Valid)
		assert.False(t, customer.Phone.Valid)

		mockQueries.AssertExpectations(t)
	})

	t.Run("database error", func(t *testing.T) {
		req := CreateCustomerParams{
			TenantID: tenantID,
			Name:     "Error Customer",
		}

		mockQueries.On("CreateCustomer", mock.Anything, mock.Anything).
			Return(db.Customer{}, errors.New("database connection failed"))

		customer, err := service.CreateCustomer(context.Background(), req)

		assert.Error(t, err)
		assert.Equal(t, db.Customer{}, customer)
		assert.Contains(t, err.Error(), "failed to create customer")

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
			ID:        customerID,
			TenantID:  tenantID,
			Name:      "Found Customer",
			Email:     sql.NullString{String: "found@customer.com", Valid: true},
			Phone:     sql.NullString{String: "+1-555-0123", Valid: true},
			IsActive:  sql.NullBool{Bool: true, Valid: true},
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
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
}

func TestCustomerService_ListCustomers(t *testing.T) {
	mockQueries := &MockQueries{}
	service := &CustomerService{q: mockQueries}

	tenantID := uuid.New()

	t.Run("successful list with pagination", func(t *testing.T) {
		expectedCustomers := []db.Customer{
			{
				ID:        uuid.New(),
				TenantID:  tenantID,
				Name:      "Customer 1",
				IsActive:  sql.NullBool{Bool: true, Valid: true},
				CreatedAt: time.Now(),
				UpdatedAt: time.Now(),
			},
			{
				ID:        uuid.New(),
				TenantID:  tenantID,
				Name:      "Customer 2",
				IsActive:  sql.NullBool{Bool: true, Valid: true},
				CreatedAt: time.Now(),
				UpdatedAt: time.Now(),
			},
		}

		mockQueries.On("ListCustomers", mock.Anything, db.ListCustomersParams{
			TenantID: tenantID,
			Limit:    10,
			Offset:   0,
		}).Return(expectedCustomers, nil)

		customers, err := service.ListCustomers(context.Background(), tenantID, 10, 0)

		require.NoError(t, err)
		assert.Len(t, customers, 2)
		assert.Equal(t, expectedCustomers[0].Name, customers[0].Name)
		assert.Equal(t, expectedCustomers[1].Name, customers[1].Name)

		mockQueries.AssertExpectations(t)
	})

	t.Run("empty result", func(t *testing.T) {
		mockQueries.On("ListCustomers", mock.Anything, db.ListCustomersParams{
			TenantID: tenantID,
			Limit:    10,
			Offset:   0,
		}).Return([]db.Customer{}, nil)

		customers, err := service.ListCustomers(context.Background(), tenantID, 10, 0)

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
		req := UpdateCustomerParams{
			ID:            customerID,
			TenantID:      tenantID,
			Name:          "Updated Customer Name",
			Email:         "updated@customer.com",
			Phone:         "+1-555-9999",
			Address:       "456 Updated St, Updated City, UC 54321",
			ContactPerson: "Jane Doe",
			PaymentMode:   "cash",
			IsActive:      true,
		}

		expectedCustomer := db.Customer{
			ID:            customerID,
			TenantID:      tenantID,
			Name:          req.Name,
			ContactPerson: sql.NullString{String: req.ContactPerson, Valid: true},
			Email:         sql.NullString{String: req.Email, Valid: true},
			Phone:         sql.NullString{String: req.Phone, Valid: true},
			Address:       sql.NullString{String: req.Address, Valid: true},
			PaymentMode:   sql.NullString{String: req.PaymentMode, Valid: true},
			IsActive:      sql.NullBool{Bool: req.IsActive, Valid: true},
			CreatedAt:     time.Now(),
			UpdatedAt:     time.Now(),
		}

		mockQueries.On("UpdateCustomer", mock.Anything, mock.MatchedBy(func(arg db.UpdateCustomerParams) bool {
			return arg.ID == customerID &&
				arg.TenantID == tenantID &&
				arg.Name == req.Name &&
				arg.Email.String == req.Email
		})).Return(expectedCustomer, nil)

		customer, err := service.UpdateCustomer(context.Background(), req)

		require.NoError(t, err)
		assert.Equal(t, expectedCustomer.ID, customer.ID)
		assert.Equal(t, expectedCustomer.Name, customer.Name)
		assert.Equal(t, req.Email, customer.Email.String)

		mockQueries.AssertExpectations(t)
	})
}

func TestCustomerService_DeleteCustomer(t *testing.T) {
	mockQueries := &MockQueries{}
	service := &CustomerService{q: mockQueries}

	customerID := uuid.New()
	tenantID := uuid.New()

	t.Run("successful customer deactivation", func(t *testing.T) {
		mockQueries.On("DeactivateCustomer", mock.Anything, db.DeactivateCustomerParams{
			ID:       customerID,
			TenantID: tenantID,
		}).Return(nil)

		err := service.DeleteCustomer(context.Background(), customerID, tenantID)

		require.NoError(t, err)
		mockQueries.AssertExpectations(t)
	})

	t.Run("customer not found", func(t *testing.T) {
		mockQueries.On("DeactivateCustomer", mock.Anything, db.DeactivateCustomerParams{
			ID:       customerID,
			TenantID: tenantID,
		}).Return(sql.ErrNoRows)

		err := service.DeleteCustomer(context.Background(), customerID, tenantID)

		assert.Error(t, err)
		assert.Contains(t, err.Error(), "failed to deactivate customer")

		mockQueries.AssertExpectations(t)
	})
}

func TestCustomerService_SearchCustomers(t *testing.T) {
	mockQueries := &MockQueries{}
	service := &CustomerService{q: mockQueries}

	tenantID := uuid.New()

	t.Run("successful search", func(t *testing.T) {
		searchTerm := "test"
		expectedCustomers := []db.Customer{
			{
				ID:        uuid.New(),
				TenantID:  tenantID,
				Name:      "Test Customer",
				IsActive:  sql.NullBool{Bool: true, Valid: true},
				CreatedAt: time.Now(),
				UpdatedAt: time.Now(),
			},
		}

		mockQueries.On("SearchCustomers", mock.Anything, db.SearchCustomersParams{
			TenantID: tenantID,
			Name:     "%" + searchTerm + "%",
			Limit:    10,
			Offset:   0,
		}).Return(expectedCustomers, nil)

		customers, err := service.SearchCustomers(context.Background(), tenantID, searchTerm, 10, 0)

		require.NoError(t, err)
		assert.Len(t, customers, 1)
		assert.Equal(t, expectedCustomers[0].Name, customers[0].Name)

		mockQueries.AssertExpectations(t)
	})
}

func TestCustomerService_CountCustomers(t *testing.T) {
	mockQueries := &MockQueries{}
	service := &CustomerService{q: mockQueries}

	tenantID := uuid.New()

	t.Run("successful count", func(t *testing.T) {
		expectedCount := int64(25)

		mockQueries.On("CountCustomers", mock.Anything, tenantID).Return(expectedCount, nil)

		count, err := service.CountCustomers(context.Background(), tenantID)

		require.NoError(t, err)
		assert.Equal(t, expectedCount, count)

		mockQueries.AssertExpectations(t)
	})

	t.Run("database error", func(t *testing.T) {
		mockQueries.On("CountCustomers", mock.Anything, tenantID).Return(int64(0), errors.New("connection failed"))

		count, err := service.CountCustomers(context.Background(), tenantID)

		assert.Error(t, err)
		assert.Equal(t, int64(0), count)
		assert.Contains(t, err.Error(), "failed to count customers")

		mockQueries.AssertExpectations(t)
	})
}

func TestCustomerService_CheckCustomerExists(t *testing.T) {
	mockQueries := &MockQueries{}
	service := &CustomerService{q: mockQueries}

	customerID := uuid.New()
	tenantID := uuid.New()

	t.Run("customer exists", func(t *testing.T) {
		mockQueries.On("CheckCustomerExists", mock.Anything, db.CheckCustomerExistsParams{
			ID:       customerID,
			TenantID: tenantID,
		}).Return(true, nil)

		exists, err := service.CheckCustomerExists(context.Background(), customerID, tenantID)

		require.NoError(t, err)
		assert.True(t, exists)

		mockQueries.AssertExpectations(t)
	})

	t.Run("customer does not exist", func(t *testing.T) {
		mockQueries.On("CheckCustomerExists", mock.Anything, db.CheckCustomerExistsParams{
			ID:       customerID,
			TenantID: tenantID,
		}).Return(false, nil)

		exists, err := service.CheckCustomerExists(context.Background(), customerID, tenantID)

		require.NoError(t, err)
		assert.False(t, exists)

		mockQueries.AssertExpectations(t)
	})
}