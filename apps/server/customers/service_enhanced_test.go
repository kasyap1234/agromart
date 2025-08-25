package customers

import (
	"context"
	"database/sql"
	"errors"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"

	"agromart2/db"
)

// MockCustomerQuerier implements the CustomerQuerier interface for testing
type MockCustomerQuerier struct {
	mock.Mock
}

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

func TestEnhancedCustomerService_CreateCustomer(t *testing.T) {
	mockQuerier := &MockCustomerQuerier{}
	service := &CustomerService{q: mockQuerier}

	tenantID := uuid.New()
	ctx := context.Background()

	t.Run("successful customer creation with all fields", func(t *testing.T) {
		params := CreateCustomerParams{
			TenantID:      tenantID,
			Name:          "John Doe Enterprises",
			ContactPerson: "John Doe",
			Email:         "john@example.com",
			Phone:         "+1234567890",
			Address:       "123 Business St, City, State 12345",
			PaymentMode:   "NET30",
		}

		expectedCustomer := db.Customer{
			ID:            uuid.New(),
			TenantID:      tenantID,
			Name:          params.Name,
			ContactPerson: sql.NullString{String: params.ContactPerson, Valid: true},
			Email:         sql.NullString{String: params.Email, Valid: true},
			Phone:         sql.NullString{String: params.Phone, Valid: true},
			Address:       sql.NullString{String: params.Address, Valid: true},
			PaymentMode:   sql.NullString{String: params.PaymentMode, Valid: true},
			IsActive:      true,
		}

		mockQuerier.On("CreateCustomer", ctx, mock.MatchedBy(func(arg db.CreateCustomerParams) bool {
			return arg.TenantID == tenantID &&
				arg.Name == params.Name &&
				arg.ContactPerson.String == params.ContactPerson &&
				arg.ContactPerson.Valid == true &&
				arg.Email.String == params.Email &&
				arg.Email.Valid == true &&
				arg.Phone.String == params.Phone &&
				arg.Phone.Valid == true &&
				arg.Address.String == params.Address &&
				arg.Address.Valid == true &&
				arg.PaymentMode.String == params.PaymentMode &&
				arg.PaymentMode.Valid == true
		})).Return(expectedCustomer, nil)

		result, err := service.CreateCustomer(ctx, params)

		require.NoError(t, err)
		assert.Equal(t, expectedCustomer.ID, result.ID)
		assert.Equal(t, params.Name, result.Name)
		assert.Equal(t, params.Email, result.Email.String)
		mockQuerier.AssertExpectations(t)
	})

	t.Run("customer creation with minimal fields", func(t *testing.T) {
		params := CreateCustomerParams{
			TenantID: tenantID,
			Name:     "Minimal Customer",
		}

		expectedCustomer := db.Customer{
			ID:       uuid.New(),
			TenantID: tenantID,
			Name:     params.Name,
			IsActive: true,
		}

		mockQuerier.On("CreateCustomer", ctx, mock.MatchedBy(func(arg db.CreateCustomerParams) bool {
			return arg.TenantID == tenantID &&
				arg.Name == params.Name &&
				arg.ContactPerson.Valid == false &&
				arg.Email.Valid == false &&
				arg.Phone.Valid == false &&
				arg.Address.Valid == false &&
				arg.PaymentMode.Valid == false
		})).Return(expectedCustomer, nil)

		result, err := service.CreateCustomer(ctx, params)

		require.NoError(t, err)
		assert.Equal(t, expectedCustomer.ID, result.ID)
		assert.Equal(t, params.Name, result.Name)
		mockQuerier.AssertExpectations(t)
	})

	t.Run("database error during creation", func(t *testing.T) {
		params := CreateCustomerParams{
			TenantID: tenantID,
			Name:     "Error Customer",
		}

		mockQuerier.On("CreateCustomer", ctx, mock.Anything).Return(db.Customer{}, errors.New("database error"))

		result, err := service.CreateCustomer(ctx, params)

		require.Error(t, err)
		assert.Contains(t, err.Error(), "failed to create customer")
		assert.Equal(t, db.Customer{}, result)
		mockQuerier.AssertExpectations(t)
	})
}

func TestEnhancedCustomerService_GetCustomerByID(t *testing.T) {
	mockQuerier := &MockCustomerQuerier{}
	service := &CustomerService{q: mockQuerier}

	customerID := uuid.New()
	tenantID := uuid.New()
	ctx := context.Background()

	t.Run("customer found", func(t *testing.T) {
		expectedCustomer := db.Customer{
			ID:       customerID,
			TenantID: tenantID,
			Name:     "Test Customer",
			IsActive: true,
		}

		mockQuerier.On("GetCustomerByID", ctx, db.GetCustomerByIDParams{
			ID:       customerID,
			TenantID: tenantID,
		}).Return(expectedCustomer, nil)

		result, err := service.GetCustomerByID(ctx, customerID, tenantID)

		require.NoError(t, err)
		assert.Equal(t, expectedCustomer.ID, result.ID)
		assert.Equal(t, expectedCustomer.Name, result.Name)
		mockQuerier.AssertExpectations(t)
	})

	t.Run("customer not found", func(t *testing.T) {
		mockQuerier.On("GetCustomerByID", ctx, db.GetCustomerByIDParams{
			ID:       customerID,
			TenantID: tenantID,
		}).Return(db.Customer{}, sql.ErrNoRows)

		result, err := service.GetCustomerByID(ctx, customerID, tenantID)

		require.Error(t, err)
		assert.Contains(t, err.Error(), "customer not found")
		assert.Equal(t, db.Customer{}, result)
		mockQuerier.AssertExpectations(t)
	})
}

func TestEnhancedCustomerService_ListCustomers(t *testing.T) {
	mockQuerier := &MockCustomerQuerier{}
	service := &CustomerService{q: mockQuerier}

	tenantID := uuid.New()
	ctx := context.Background()

	t.Run("successful list with results", func(t *testing.T) {
		expectedCustomers := []db.Customer{
			{ID: uuid.New(), TenantID: tenantID, Name: "Customer 1", IsActive: sql.NullBool{Bool: true, Valid: true}},
			{ID: uuid.New(), TenantID: tenantID, Name: "Customer 2", IsActive: sql.NullBool{Bool: true, Valid: true}},
			{ID: uuid.New(), TenantID: tenantID, Name: "Customer 3", IsActive: sql.NullBool{Bool: false, Valid: true}},
		}

		mockQuerier.On("ListCustomers", ctx, db.ListCustomersParams{
			TenantID: tenantID,
			Limit:    50,
			Offset:   0,
		}).Return(expectedCustomers, nil)

		result, err := service.ListCustomers(ctx, tenantID, 50, 0)

		require.NoError(t, err)
		assert.Len(t, result, 3)
		assert.Equal(t, expectedCustomers[0].Name, result[0].Name)
		mockQuerier.AssertExpectations(t)
	})

	t.Run("empty result set", func(t *testing.T) {
		mockQuerier.On("ListCustomers", ctx, db.ListCustomersParams{
			TenantID: tenantID,
			Limit:    10,
			Offset:   0,
		}).Return([]db.Customer{}, nil)

		result, err := service.ListCustomers(ctx, tenantID, 10, 0)

		require.NoError(t, err)
		assert.Len(t, result, 0)
		mockQuerier.AssertExpectations(t)
	})
}

func TestEnhancedCustomerService_SearchCustomers(t *testing.T) {
	mockQuerier := &MockCustomerQuerier{}
	service := &CustomerService{q: mockQuerier}

	tenantID := uuid.New()
	ctx := context.Background()

	t.Run("successful search with results", func(t *testing.T) {
		searchTerm := "John"
		expectedCustomers := []db.Customer{
			{ID: uuid.New(), TenantID: tenantID, Name: "John Doe", IsActive: sql.NullBool{Bool: true, Valid: true}},
			{ID: uuid.New(), TenantID: tenantID, Name: "Johnny Smith", IsActive: sql.NullBool{Bool: true, Valid: true}},
		}

		mockQuerier.On("SearchCustomers", ctx, db.SearchCustomersParams{
			TenantID: tenantID,
			Name:     "%" + searchTerm + "%",
			Limit:    20,
			Offset:   0,
		}).Return(expectedCustomers, nil)

		result, err := service.SearchCustomers(ctx, tenantID, searchTerm, 20, 0)

		require.NoError(t, err)
		assert.Len(t, result, 2)
		assert.Contains(t, result[0].Name, "John")
		mockQuerier.AssertExpectations(t)
	})

	t.Run("search with no results", func(t *testing.T) {
		searchTerm := "NonExistent"

		mockQuerier.On("SearchCustomers", ctx, db.SearchCustomersParams{
			TenantID: tenantID,
			Name:     "%" + searchTerm + "%",
			Limit:    20,
			Offset:   0,
		}).Return([]db.Customer{}, nil)

		result, err := service.SearchCustomers(ctx, tenantID, searchTerm, 20, 0)

		require.NoError(t, err)
		assert.Len(t, result, 0)
		mockQuerier.AssertExpectations(t)
	})
}

func TestEnhancedCustomerService_UpdateCustomer(t *testing.T) {
	mockQuerier := &MockCustomerQuerier{}
	service := &CustomerService{q: mockQuerier}

	customerID := uuid.New()
	tenantID := uuid.New()
	ctx := context.Background()

	t.Run("successful update", func(t *testing.T) {
		params := UpdateCustomerParams{
			ID:            customerID,
			TenantID:      tenantID,
			Name:          "Updated Customer Name",
			ContactPerson: "New Contact",
			Email:         "new@example.com",
			Phone:         "+9876543210",
			Address:       "New Address",
			PaymentMode:   "CASH",
			IsActive:      true,
		}

		expectedCustomer := db.Customer{
			ID:            customerID,
			TenantID:      tenantID,
			Name:          params.Name,
			ContactPerson: sql.NullString{String: params.ContactPerson, Valid: true},
			Email:         sql.NullString{String: params.Email, Valid: true},
			Phone:         sql.NullString{String: params.Phone, Valid: true},
			Address:       sql.NullString{String: params.Address, Valid: true},
			PaymentMode:   sql.NullString{String: params.PaymentMode, Valid: true},
			IsActive:      sql.NullBool{Bool: params.IsActive, Valid: true},
		}

		mockQuerier.On("UpdateCustomer", ctx, mock.MatchedBy(func(arg db.UpdateCustomerParams) bool {
			return arg.ID == customerID &&
				arg.TenantID == tenantID &&
				arg.Name == params.Name &&
				arg.Email.String == params.Email &&
				arg.IsActive.Bool == params.IsActive
		})).Return(expectedCustomer, nil)

		result, err := service.UpdateCustomer(ctx, params)

		require.NoError(t, err)
		assert.Equal(t, customerID, result.ID)
		assert.Equal(t, params.Name, result.Name)
		mockQuerier.AssertExpectations(t)
	})
}

func TestEnhancedCustomerService_DeleteCustomer(t *testing.T) {
	mockQuerier := &MockCustomerQuerier{}
	service := &CustomerService{q: mockQuerier}

	customerID := uuid.New()
	tenantID := uuid.New()
	ctx := context.Background()

	t.Run("successful soft delete", func(t *testing.T) {
		mockQuerier.On("DeactivateCustomer", ctx, db.DeactivateCustomerParams{
			ID:       customerID,
			TenantID: tenantID,
		}).Return(nil)

		err := service.DeleteCustomer(ctx, customerID, tenantID)

		require.NoError(t, err)
		mockQuerier.AssertExpectations(t)
	})

	t.Run("database error during delete", func(t *testing.T) {
		mockQuerier.On("DeactivateCustomer", ctx, db.DeactivateCustomerParams{
			ID:       customerID,
			TenantID: tenantID,
		}).Return(errors.New("database error"))

		err := service.DeleteCustomer(ctx, customerID, tenantID)

		require.Error(t, err)
		assert.Contains(t, err.Error(), "failed to deactivate customer")
		mockQuerier.AssertExpectations(t)
	})
}

func TestEnhancedCustomerService_BusinessLogic(t *testing.T) {
	mockQuerier := &MockCustomerQuerier{}
	service := &CustomerService{q: mockQuerier}

	tenantID := uuid.New()
	customerID := uuid.New()
	ctx := context.Background()

	t.Run("CheckCustomerExists - customer exists", func(t *testing.T) {
		mockQuerier.On("CheckCustomerExists", ctx, db.CheckCustomerExistsParams{
			ID:       customerID,
			TenantID: tenantID,
		}).Return(true, nil)

		exists, err := service.CheckCustomerExists(ctx, customerID, tenantID)

		require.NoError(t, err)
		assert.True(t, exists)
		mockQuerier.AssertExpectations(t)
	})

	t.Run("CountCustomers - returns correct count", func(t *testing.T) {
		expectedCount := int64(25)
		mockQuerier.On("CountCustomers", ctx, tenantID).Return(expectedCount, nil)

		count, err := service.CountCustomers(ctx, tenantID)

		require.NoError(t, err)
		assert.Equal(t, expectedCount, count)
		mockQuerier.AssertExpectations(t)
	})

	t.Run("ListActiveCustomers - filters inactive customers", func(t *testing.T) {
		activeCustomers := []db.Customer{
			{ID: uuid.New(), TenantID: tenantID, Name: "Active Customer 1", IsActive: sql.NullBool{Bool: true, Valid: true}},
			{ID: uuid.New(), TenantID: tenantID, Name: "Active Customer 2", IsActive: sql.NullBool{Bool: true, Valid: true}},
		}

		mockQuerier.On("ListActiveCustomers", ctx, db.ListActiveCustomersParams{
			TenantID: tenantID,
			Limit:    10,
			Offset:   0,
		}).Return(activeCustomers, nil)

		result, err := service.ListActiveCustomers(ctx, tenantID, 10, 0)

		require.NoError(t, err)
		assert.Len(t, result, 2)
		for _, customer := range result {
			assert.True(t, customer.IsActive.Bool)
		}
		mockQuerier.AssertExpectations(t)
	})
}

func TestEnhancedCustomerService_ErrorScenarios(t *testing.T) {
	mockQuerier := &MockCustomerQuerier{}
	service := &CustomerService{q: mockQuerier}

	tenantID := uuid.New()
	ctx := context.Background()

	t.Run("context cancellation", func(t *testing.T) {
		cancelledCtx, cancel := context.WithCancel(ctx)
		cancel()

		mockQuerier.On("CountCustomers", cancelledCtx, tenantID).Return(int64(0), context.Canceled)

		count, err := service.CountCustomers(cancelledCtx, tenantID)

		assert.Error(t, err)
		assert.Equal(t, context.Canceled, err)
		assert.Equal(t, int64(0), count)
		mockQuerier.AssertExpectations(t)
	})

	t.Run("database connection timeout", func(t *testing.T) {
		mockQuerier.On("ListCustomers", ctx, mock.Anything).Return([]db.Customer{}, errors.New("connection timeout"))

		result, err := service.ListCustomers(ctx, tenantID, 10, 0)

		assert.Error(t, err)
		assert.Contains(t, err.Error(), "failed to list customers")
		assert.Len(t, result, 0)
		mockQuerier.AssertExpectations(t)
	})
}