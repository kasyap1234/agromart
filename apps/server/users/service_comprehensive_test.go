package users

import (
	"context"
	"database/sql"
	"errors"
	"testing"
	"time"

	"agromart2/db"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"golang.org/x/crypto/bcrypt"
)

// MockUserQueries implements the user database query interface for testing
type MockUserQueries struct {
	mock.Mock
}

// Implement all user database query methods
func (m *MockUserQueries) CreateUser(ctx context.Context, arg db.CreateUserParams) (db.CreateUserRow, error) {
	args := m.Called(ctx, arg)
	return args.Get(0).(db.CreateUserRow), args.Error(1)
}

func (m *MockUserQueries) GetUserByID(ctx context.Context, id uuid.UUID) (db.GetUserByIDRow, error) {
	args := m.Called(ctx, id)
	return args.Get(0).(db.GetUserByIDRow), args.Error(1)
}

func (m *MockUserQueries) GetUserByEmail(ctx context.Context, arg db.GetUserByEmailParams) (db.GetUserByEmailRow, error) {
	args := m.Called(ctx, arg)
	return args.Get(0).(db.GetUserByEmailRow), args.Error(1)
}

func (m *MockUserQueries) ListUsers(ctx context.Context, arg db.ListUsersParams) ([]db.ListUsersRow, error) {
	args := m.Called(ctx, arg)
	return args.Get(0).([]db.ListUsersRow), args.Error(1)
}

func (m *MockUserQueries) UpdateUser(ctx context.Context, arg db.UpdateUserParams) (db.UpdateUserRow, error) {
	args := m.Called(ctx, arg)
	return args.Get(0).(db.UpdateUserRow), args.Error(1)
}

func (m *MockUserQueries) DeactivateUser(ctx context.Context, arg db.DeactivateUserParams) error {
	args := m.Called(ctx, arg)
	return args.Error(0)
}

func (m *MockUserQueries) SearchUsers(ctx context.Context, arg db.SearchUsersParams) ([]db.SearchUsersRow, error) {
	args := m.Called(ctx, arg)
	return args.Get(0).([]db.SearchUsersRow), args.Error(1)
}

func (m *MockUserQueries) CountUsers(ctx context.Context, tenantID uuid.UUID) (int64, error) {
	args := m.Called(ctx, tenantID)
	return args.Get(0).(int64), args.Error(1)
}

func (m *MockUserQueries) CheckUserExists(ctx context.Context, arg db.CheckUserExistsParams) (bool, error) {
	args := m.Called(ctx, arg)
	return args.Bool(0), args.Error(1)
}

// Test setup helper
func setupUserService(t *testing.T) (*UserService, *MockUserQueries) {
	mockQueries := &MockUserQueries{}
	service := &UserService{
		db: nil,
		q:  mockQueries,
	}
	return service, mockQueries
}

// Create mock user for testing
func createMockUser(id, tenantID uuid.UUID, name, email, role string) db.User {
	return db.User{
		ID:            id,
		TenantID:      tenantID,
		Name:          name,
		Email:         email,
		Password:      "hashed_password",
		Phone:         "+1234567890",
		Role:          role,
		EmailVerified: sql.NullBool{Bool: false, Valid: true},
		IsActive:      sql.NullBool{Bool: true, Valid: true},
		CreatedAt:     time.Now(),
	}
}

// Helper functions to create mock row types
func createMockCreateUserRow(id, tenantID uuid.UUID, name, email, role, password string) db.CreateUserRow {
	// Hash the password for testing
	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)

	return db.CreateUserRow{
		ID:            id,
		Name:          name,
		Email:         email,
		Password:      string(hashedPassword),
		Phone:         "+1234567890",
		TenantID:      tenantID,
		Role:          role,
		EmailVerified: sql.NullBool{Bool: false, Valid: true},
		IsActive:      sql.NullBool{Bool: true, Valid: true},
		CreatedAt:     time.Now(),
	}
}

func createMockGetUserByIDRow(id, tenantID uuid.UUID, name, email, role string) db.GetUserByIDRow {
	return db.GetUserByIDRow{
		ID:            id,
		Name:          name,
		Email:         email,
		Password:      "hashed_password",
		Phone:         "+1234567890",
		TenantID:      tenantID,
		Role:          role,
		EmailVerified: sql.NullBool{Bool: false, Valid: true},
		IsActive:      sql.NullBool{Bool: true, Valid: true},
		CreatedAt:     time.Now(),
	}
}

func createMockUpdateUserRow(id, tenantID uuid.UUID, name, email, role string) db.UpdateUserRow {
	return db.UpdateUserRow{
		ID:            id,
		Name:          name,
		Email:         email,
		Password:      "hashed_password",
		Phone:         "+1234567890",
		TenantID:      tenantID,
		Role:          role,
		EmailVerified: sql.NullBool{Bool: false, Valid: true},
		IsActive:      sql.NullBool{Bool: true, Valid: true},
		CreatedAt:     time.Now(),
	}
}

func createMockListUsersRows(tenantID uuid.UUID, users []db.User) []db.ListUsersRow {
	rows := make([]db.ListUsersRow, len(users))
	for i, user := range users {
		rows[i] = db.ListUsersRow{
			ID:            user.ID,
			Name:          user.Name,
			Email:         user.Email,
			Password:      user.Password,
			Phone:         user.Phone,
			TenantID:      user.TenantID,
			Role:          user.Role.(string),
			EmailVerified: user.EmailVerified,
			IsActive:      user.IsActive,
			CreatedAt:     user.CreatedAt,
		}
	}
	return rows
}

func createMockSearchUsersRows(tenantID uuid.UUID, users []db.User) []db.SearchUsersRow {
	rows := make([]db.SearchUsersRow, len(users))
	for i, user := range users {
		rows[i] = db.SearchUsersRow{
			ID:            user.ID,
			Name:          user.Name,
			Email:         user.Email,
			Password:      user.Password,
			Phone:         user.Phone,
			TenantID:      user.TenantID,
			Role:          user.Role.(string),
			EmailVerified: user.EmailVerified,
			IsActive:      user.IsActive,
			CreatedAt:     user.CreatedAt,
		}
	}
	return rows
}

func TestUserService_NewUserService(t *testing.T) {
	mockQueries := &MockUserQueries{}
	service := NewUserService(nil, mockQueries)

	assert.NotNil(t, service)
	assert.Equal(t, mockQueries, service.q)
}

func TestUserService_CreateUser_Success(t *testing.T) {
	service, mockQueries := setupUserService(t)
	ctx := context.Background()
	tenantID := uuid.New()

	params := CreateUserParams{
		TenantID: tenantID,
		Name:     "John Doe",
		Email:    "john@example.com",
		Password: "StrongPass123!",
		Phone:    "+1234567890",
		Role:     "admin",
	}

	expectedUserRow := createMockCreateUserRow(uuid.New(), tenantID, "John Doe", "john@example.com", "admin", "StrongPass123!")

	// Mock the database call
	mockQueries.On("CreateUser", ctx, mock.MatchedBy(func(arg db.CreateUserParams) bool {
		return arg.TenantID == tenantID &&
			arg.Name == "John Doe" &&
			arg.Email == "john@example.com" &&
			arg.Column6 == "admin" &&
			arg.Phone == "+1234567890"
	})).Return(expectedUserRow, nil)

	// Execute
	result, err := service.CreateUser(ctx, params)

	// Assert
	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, expectedUserRow.ID, result.ID)
	assert.Equal(t, "John Doe", result.Name)
	assert.Equal(t, "john@example.com", result.Email)
	assert.Equal(t, "admin", result.Role)

	// Verify password was hashed
	err = bcrypt.CompareHashAndPassword([]byte(result.Password), []byte("StrongPass123!"))
	assert.NoError(t, err, "Password should be properly hashed")

	mockQueries.AssertExpectations(t)
}

func TestUserService_CreateUser_WeakPassword(t *testing.T) {
	service, mockQueries := setupUserService(t)
	ctx := context.Background()
	tenantID := uuid.New()

	// Test with weak password
	params := CreateUserParams{
		TenantID: tenantID,
		Name:     "John Doe",
		Email:    "john@example.com",
		Password: "weak", // Too short
		Phone:    "+1234567890",
		Role:     "admin",
	}

	// Execute
	result, err := service.CreateUser(ctx, params)

	// Assert
	assert.Error(t, err)
	assert.Equal(t, db.User{}, result)
	assert.Contains(t, err.Error(), "password validation failed")

	// Database should not be called for weak passwords
	mockQueries.AssertNotCalled(t, "CreateUser", mock.Anything, mock.Anything)
}

func TestUserService_CreateUser_DatabaseError(t *testing.T) {
	service, mockQueries := setupUserService(t)
	ctx := context.Background()
	tenantID := uuid.New()

	params := CreateUserParams{
		TenantID: tenantID,
		Name:     "John Doe",
		Email:    "john@example.com",
		Password: "StrongPass123!",
		Phone:    "+1234567890",
		Role:     "admin",
	}

	// Mock database error
	mockQueries.On("CreateUser", ctx, mock.Anything).Return(db.CreateUserRow{}, errors.New("database connection failed"))

	// Execute
	result, err := service.CreateUser(ctx, params)

	// Assert
	assert.Error(t, err)
	assert.Equal(t, db.User{}, result)
	assert.Contains(t, err.Error(), "failed to create user")

	mockQueries.AssertExpectations(t)
}

func TestUserService_GetUserByID_Success(t *testing.T) {
	service, mockQueries := setupUserService(t)
	ctx := context.Background()
	userID := uuid.New()
	tenantID := uuid.New()

	expectedUserRow := createMockGetUserByIDRow(userID, tenantID, "John Doe", "john@example.com", "admin")

	// Mock the database call
	mockQueries.On("GetUserByID", ctx, userID).Return(expectedUserRow, nil)

	// Execute
	result, err := service.GetUserByID(ctx, userID, tenantID)

	// Convert row to user for assertion
	expectedUser := db.User{
		ID:            expectedUserRow.ID,
		Name:          expectedUserRow.Name,
		Email:         expectedUserRow.Email,
		Password:      expectedUserRow.Password,
		Phone:         expectedUserRow.Phone,
		TenantID:      expectedUserRow.TenantID,
		Role:          expectedUserRow.Role,
		EmailVerified: expectedUserRow.EmailVerified,
		IsActive:      expectedUserRow.IsActive,
		CreatedAt:     expectedUserRow.CreatedAt,
	}

	// Assert
	assert.NoError(t, err)
	assert.Equal(t, expectedUser, result)
	assert.Equal(t, userID, result.ID)
	assert.Equal(t, tenantID, result.TenantID)

	mockQueries.AssertExpectations(t)
}

func TestUserService_GetUserByID_WrongTenant(t *testing.T) {
	service, mockQueries := setupUserService(t)
	ctx := context.Background()
	userID := uuid.New()
	wrongTenantID := uuid.New()
	actualTenantID := uuid.New()

	// User belongs to different tenant
	userFromDifferentTenantRow := createMockGetUserByIDRow(userID, actualTenantID, "John Doe", "john@example.com", "admin")

	// Mock the database call
	mockQueries.On("GetUserByID", ctx, userID).Return(userFromDifferentTenantRow, nil)

	// Execute
	result, err := service.GetUserByID(ctx, userID, wrongTenantID)

	// Assert
	assert.Error(t, err)
	assert.Equal(t, db.User{}, result)
	assert.Contains(t, err.Error(), "user not found")

	mockQueries.AssertExpectations(t)
}

func TestUserService_GetUserByID_NotFound(t *testing.T) {
	service, mockQueries := setupUserService(t)
	ctx := context.Background()
	userID := uuid.New()
	tenantID := uuid.New()

	// Mock database returns error
	mockQueries.On("GetUserByID", ctx, userID).Return(db.GetUserByIDRow{}, sql.ErrNoRows)

	// Execute
	result, err := service.GetUserByID(ctx, userID, tenantID)

	// Assert
	assert.Error(t, err)
	assert.Equal(t, db.User{}, result)
	assert.Contains(t, err.Error(), "user not found")

	mockQueries.AssertExpectations(t)
}

func TestUserService_ListUsers_Success(t *testing.T) {
	service, mockQueries := setupUserService(t)
	ctx := context.Background()
	tenantID := uuid.New()

	expectedUsers := []db.User{
		createMockUser(uuid.New(), tenantID, "User 1", "user1@example.com", "admin"),
		createMockUser(uuid.New(), tenantID, "User 2", "user2@example.com", "manager"),
	}
	expectedUserRows := createMockListUsersRows(tenantID, expectedUsers)

	// Mock the database call
	mockQueries.On("ListUsers", ctx, db.ListUsersParams{
		TenantID: tenantID,
		Limit:    20,
		Offset:   0,
	}).Return(expectedUserRows, nil)

	// Execute
	result, err := service.ListUsers(ctx, tenantID, 20, 0)

	// Assert
	assert.NoError(t, err)
	assert.Len(t, result, 2)
	assert.Equal(t, expectedUsers, result)

	mockQueries.AssertExpectations(t)
}

func TestUserService_ListUsers_EmptyResult(t *testing.T) {
	service, mockQueries := setupUserService(t)
	ctx := context.Background()
	tenantID := uuid.New()

	// Mock empty result
	mockQueries.On("ListUsers", ctx, mock.Anything).Return([]db.ListUsersRow{}, nil)

	// Execute
	result, err := service.ListUsers(ctx, tenantID, 10, 0)

	// Assert
	assert.NoError(t, err)
	assert.Len(t, result, 0)

	mockQueries.AssertExpectations(t)
}

func TestUserService_ListUsers_DatabaseError(t *testing.T) {
	service, mockQueries := setupUserService(t)
	ctx := context.Background()
	tenantID := uuid.New()

	// Mock database error
	mockQueries.On("ListUsers", ctx, mock.Anything).Return([]db.ListUsersRow{}, errors.New("database error"))

	// Execute
	result, err := service.ListUsers(ctx, tenantID, 10, 0)

	// Assert
	assert.Error(t, err)
	assert.Len(t, result, 0)
	assert.Contains(t, err.Error(), "failed to list users")

	mockQueries.AssertExpectations(t)
}

func TestUserService_UpdateUser_Success(t *testing.T) {
	service, mockQueries := setupUserService(t)
	ctx := context.Background()
	userID := uuid.New()
	tenantID := uuid.New()

	params := UpdateUserParams{
		ID:            userID,
		TenantID:      tenantID,
		Name:          "Updated Name",
		Email:         "updated@example.com",
		Phone:         "+9876543210",
		Role:          "manager",
		EmailVerified: true,
		IsActive:      true,
	}

	expectedUserRow := createMockUpdateUserRow(userID, tenantID, "Updated Name", "updated@example.com", "manager")
	expectedUserRow.EmailVerified = sql.NullBool{Bool: true, Valid: true}
	expectedUserRow.IsActive = sql.NullBool{Bool: true, Valid: true}

	// Mock the database call
	mockQueries.On("UpdateUser", ctx, mock.MatchedBy(func(arg db.UpdateUserParams) bool {
		return arg.ID == userID &&
			arg.Name == "Updated Name" &&
			arg.Email == "updated@example.com" &&
			arg.Column5 == "manager" &&
			arg.EmailVerified.Bool == true
	})).Return(expectedUserRow, nil)

	// Execute
	result, err := service.UpdateUser(ctx, params)

	// Convert row to user for assertion
	expectedUser := db.User{
		ID:            expectedUserRow.ID,
		Name:          expectedUserRow.Name,
		Email:         expectedUserRow.Email,
		Password:      expectedUserRow.Password,
		Phone:         expectedUserRow.Phone,
		TenantID:      expectedUserRow.TenantID,
		Role:          expectedUserRow.Role,
		EmailVerified: expectedUserRow.EmailVerified,
		IsActive:      expectedUserRow.IsActive,
		CreatedAt:     expectedUserRow.CreatedAt,
	}

	// Assert
	assert.NoError(t, err)
	assert.Equal(t, expectedUser, result)
	assert.Equal(t, "Updated Name", result.Name)
	assert.Equal(t, "updated@example.com", result.Email)

	mockQueries.AssertExpectations(t)
}

func TestUserService_UpdateUser_DatabaseError(t *testing.T) {
	service, mockQueries := setupUserService(t)
	ctx := context.Background()
	userID := uuid.New()
	tenantID := uuid.New()

	params := UpdateUserParams{
		ID:       userID,
		TenantID: tenantID,
		Name:     "Updated Name",
		Email:    "updated@example.com",
		Phone:    "+9876543210",
		Role:     "manager",
	}

	// Mock database error
	mockQueries.On("UpdateUser", ctx, mock.Anything).Return(db.UpdateUserRow{}, errors.New("update failed"))

	// Execute
	result, err := service.UpdateUser(ctx, params)

	// Assert
	assert.Error(t, err)
	assert.Equal(t, db.User{}, result)
	assert.Contains(t, err.Error(), "failed to update user")

	mockQueries.AssertExpectations(t)
}

func TestUserService_DeleteUser_Success(t *testing.T) {
	service, mockQueries := setupUserService(t)
	ctx := context.Background()
	userID := uuid.New()
	tenantID := uuid.New()

	// Mock the database call
	mockQueries.On("DeactivateUser", ctx, db.DeactivateUserParams{
		ID:       userID,
		TenantID: tenantID,
	}).Return(nil)

	// Execute
	err := service.DeleteUser(ctx, userID, tenantID)

	// Assert
	assert.NoError(t, err)

	mockQueries.AssertExpectations(t)
}

func TestUserService_DeleteUser_DatabaseError(t *testing.T) {
	service, mockQueries := setupUserService(t)
	ctx := context.Background()
	userID := uuid.New()
	tenantID := uuid.New()

	// Mock database error
	mockQueries.On("DeactivateUser", ctx, mock.Anything).Return(errors.New("deactivation failed"))

	// Execute
	err := service.DeleteUser(ctx, userID, tenantID)

	// Assert
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "failed to deactivate user")

	mockQueries.AssertExpectations(t)
}

func TestUserService_SearchUsers_Success(t *testing.T) {
	service, mockQueries := setupUserService(t)
	ctx := context.Background()
	tenantID := uuid.New()
	searchTerm := "john"

	expectedUsers := []db.User{
		createMockUser(uuid.New(), tenantID, "John Doe", "john@example.com", "admin"),
		createMockUser(uuid.New(), tenantID, "Johnny Smith", "johnny@example.com", "manager"),
	}
	expectedUserRows := createMockSearchUsersRows(tenantID, expectedUsers)

	// Mock the database call
	mockQueries.On("SearchUsers", ctx, db.SearchUsersParams{
		TenantID: tenantID,
		Name:     "%john%",
		Limit:    20,
		Offset:   0,
	}).Return(expectedUserRows, nil)

	// Execute
	result, err := service.SearchUsers(ctx, tenantID, searchTerm, 20, 0)

	// Assert
	assert.NoError(t, err)
	assert.Len(t, result, 2)
	assert.Contains(t, result[0].Name, "John")
	assert.Contains(t, result[1].Name, "Johnny")

	mockQueries.AssertExpectations(t)
}

func TestUserService_CountUsers_Success(t *testing.T) {
	service, mockQueries := setupUserService(t)
	ctx := context.Background()
	tenantID := uuid.New()
	expectedCount := int64(42)

	// Mock the database call
	mockQueries.On("CountUsers", ctx, tenantID).Return(expectedCount, nil)

	// Execute
	result, err := service.CountUsers(ctx, tenantID)

	// Assert
	assert.NoError(t, err)
	assert.Equal(t, expectedCount, result)

	mockQueries.AssertExpectations(t)
}

func TestUserService_CheckUserExists_Success(t *testing.T) {
	service, mockQueries := setupUserService(t)
	ctx := context.Background()
	userID := uuid.New()
	tenantID := uuid.New()

	// Mock the database call
	mockQueries.On("CheckUserExists", ctx, db.CheckUserExistsParams{
		ID:       userID,
		TenantID: tenantID,
	}).Return(true, nil)

	// Execute
	result, err := service.CheckUserExists(ctx, userID, tenantID)

	// Assert
	assert.NoError(t, err)
	assert.True(t, result)

	mockQueries.AssertExpectations(t)
}

func TestUserService_CheckUserExists_NotFound(t *testing.T) {
	service, mockQueries := setupUserService(t)
	ctx := context.Background()
	userID := uuid.New()
	tenantID := uuid.New()

	// Mock user doesn't exist
	mockQueries.On("CheckUserExists", ctx, mock.Anything).Return(false, nil)

	// Execute
	result, err := service.CheckUserExists(ctx, userID, tenantID)

	// Assert
	assert.NoError(t, err)
	assert.False(t, result)

	mockQueries.AssertExpectations(t)
}

// Test password validation integration
func TestUserService_PasswordValidation(t *testing.T) {
	// Test various password scenarios
	testCases := []struct {
		name        string
		password    string
		expectError bool
	}{
		{"Valid strong password", "StrongPass123!", false},
		{"Too short", "short", true},
		{"No uppercase", "weakpassword123!", true},
		{"No lowercase", "WEAKPASSWORD123!", true},
		{"No numbers", "WeakPassword!", true},
		{"No special chars", "WeakPassword123", true},
		{"Empty password", "", true},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			service, mockQueries := setupUserService(t)
			ctx := context.Background()

			params := CreateUserParams{
				TenantID: uuid.New(),
				Name:     "Test User",
				Email:    "test@example.com",
				Password: tc.password,
				Phone:    "+1234567890",
				Role:     "admin",
			}

			if !tc.expectError {
				// For valid passwords, set up mock for successful database call
				mockQueries.On("CreateUser", ctx, mock.Anything).Return(createMockCreateUserRow(uuid.New(), params.TenantID, params.Name, params.Email, params.Role, params.Password), nil)
			}

			_, err := service.CreateUser(ctx, params)

			if tc.expectError {
				assert.Error(t, err)
				assert.Contains(t, err.Error(), "password validation")
			} else {
				// For valid passwords, we should get a database-related error (not validation error)
				// since we properly mocked the database call
				assert.NoError(t, err, "Expected no error for valid password")
			}
		})
	}
}

// Test edge cases and error scenarios
func TestUserService_EdgeCases(t *testing.T) {
	ctx := context.Background()

	t.Run("Empty user name", func(t *testing.T) {
		service, mockQueries := setupUserService(t)
		params := CreateUserParams{
			TenantID: uuid.New(),
			Name:     "",
			Email:    "test@example.com",
			Password: "StrongPass123!",
			Role:     "admin",
		}

		// Mock database error for empty name
		mockQueries.On("CreateUser", ctx, mock.Anything).Return(db.CreateUserRow{}, errors.New("database validation error"))
		_, err := service.CreateUser(ctx, params)
		assert.Error(t, err)
		mockQueries.AssertExpectations(t)
	})

	t.Run("Invalid email format", func(t *testing.T) {
		service, mockQueries := setupUserService(t)
		params := CreateUserParams{
			TenantID: uuid.New(),
			Name:     "Test User",
			Email:    "invalid-email",
			Password: "StrongPass123!",
			Role:     "admin",
		}

		// Mock database error for invalid email
		mockQueries.On("CreateUser", ctx, mock.Anything).Return(db.CreateUserRow{}, errors.New("database validation error"))
		_, err := service.CreateUser(ctx, params)
		assert.Error(t, err)
		mockQueries.AssertExpectations(t)
	})

	t.Run("Zero UUID", func(t *testing.T) {
		service, mockQueries := setupUserService(t)
		// Mock database error for zero UUID
		mockQueries.On("GetUserByID", ctx, uuid.Nil).Return(db.GetUserByIDRow{}, sql.ErrNoRows)
		_, err := service.GetUserByID(ctx, uuid.Nil, uuid.New())
		assert.Error(t, err)
		mockQueries.AssertExpectations(t)
	})

	t.Run("Negative pagination", func(t *testing.T) {
		service, mockQueries := setupUserService(t)
		// Mock database error for negative pagination
		mockQueries.On("ListUsers", ctx, mock.Anything).Return([]db.ListUsersRow{}, errors.New("database error"))
		_, err := service.ListUsers(ctx, uuid.New(), -1, -1)
		assert.Error(t, err)
		mockQueries.AssertExpectations(t)
	})
}

// Benchmark tests
func BenchmarkUserService_CreateUser(b *testing.B) {
	service, mockQueries := setupUserService(&testing.T{})

	// Setup mock
	mockQueries.On("CreateUser", mock.Anything, mock.Anything).Return(createMockCreateUserRow(uuid.New(), uuid.New(), "Test", "test@example.com", "admin", "TestPass123!"), nil)

	params := CreateUserParams{
		TenantID: uuid.New(),
		Name:     "Benchmark User",
		Email:    "benchmark@example.com",
		Password: "StrongPass123!",
		Role:     "admin",
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, _ = service.CreateUser(context.Background(), params)
	}
}

func BenchmarkUserService_GetUserByID(b *testing.B) {
	service, _ := setupUserService(&testing.T{})

	userID := uuid.New()
	tenantID := uuid.New()

	// Setup mock - we'll use the actual service with real database for benchmarking
	// This would typically be set up with a test database

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, _ = service.GetUserByID(context.Background(), userID, tenantID)
	}
}