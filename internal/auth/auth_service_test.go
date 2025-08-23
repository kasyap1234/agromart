package auth

import (
	"context"
	"database/sql"
	"errors"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
	"golang.org/x/crypto/bcrypt"

	"agromart2/db"
)

// MockQueries is a mock implementation of the database queries
type MockQueries struct {
	mock.Mock
}

func (m *MockQueries) GetUserByEmail(ctx context.Context, email string) (db.User, error) {
	args := m.Called(ctx, email)
	return args.Get(0).(db.User), args.Error(1)
}

func (m *MockQueries) GetUserByID(ctx context.Context, id uuid.UUID) (db.GetUserByIDRow, error) {
	args := m.Called(ctx, id)
	return args.Get(0).(db.GetUserByIDRow), args.Error(1)
}

func (m *MockQueries) CreateUser(ctx context.Context, arg db.CreateUserParams) (db.User, error) {
	args := m.Called(ctx, arg)
	return args.Get(0).(db.User), args.Error(1)
}

func (m *MockQueries) CreateTenant(ctx context.Context, arg db.CreateTenantParams) (db.Tenant, error) {
	args := m.Called(ctx, arg)
	return args.Get(0).(db.Tenant), args.Error(1)
}

func (m *MockQueries) GetTenantByID(ctx context.Context, id uuid.UUID) (db.Tenant, error) {
	args := m.Called(ctx, id)
	return args.Get(0).(db.Tenant), args.Error(1)
}

func (m *MockQueries) UpdateUserPassword(ctx context.Context, arg db.UpdateUserPasswordParams) error {
	args := m.Called(ctx, arg)
	return args.Error(0)
}

// MockPasswordValidator is a mock implementation of the password validator
type MockPasswordValidator struct {
	mock.Mock
}

func (m *MockPasswordValidator) ValidatePassword(password string) error {
	args := m.Called(password)
	return args.Error(0)
}

func TestAuthService_Register(t *testing.T) {
	mockQueries := &MockQueries{}
	mockValidator := &MockPasswordValidator{}
	jwtService := NewJWTService("test-secret")
	authService := &AuthService{
		queries:           mockQueries,
		passwordValidator: mockValidator,
		jwt:               jwtService,
	}

	t.Run("successful registration", func(t *testing.T) {
		req := RegisterRequest{
			Email:       "test@example.com",
			Password:    "StrongPassword123!",
			FirstName:   "John",
			LastName:    "Doe",
			CompanyName: "Test Company",
			Phone:       "1234567890",
		}

		tenantID := uuid.New()
		userID := uuid.New()
		hashedPassword := "$2a$10$example.hash"

		// Mock password validation success
		mockValidator.On("ValidatePassword", req.Password).Return(nil)

		// Mock user doesn't exist
		mockQueries.On("GetUserByEmail", mock.Anything, "test@example.com").
			Return(db.User{}, sql.ErrNoRows)

		// Mock tenant creation
		mockQueries.On("CreateTenant", mock.Anything, mock.MatchedBy(func(arg db.CreateTenantParams) bool {
			return arg.Name == req.CompanyName && arg.Email == req.Email && arg.Phone == req.Phone
		})).Return(db.Tenant{
			ID:        tenantID,
			Name:      req.CompanyName,
			Email:     req.Email,
			Phone:     req.Phone,
			IsActive:  true,
			CreatedAt: time.Now(),
		}, nil)

		// Mock user creation
		mockQueries.On("CreateUser", mock.Anything, mock.MatchedBy(func(arg db.CreateUserParams) bool {
			return arg.Name == "John Doe" &&
				arg.Email == req.Email &&
				arg.Phone == req.Phone &&
				arg.TenantID == tenantID &&
				arg.Role == "admin"
		})).Return(db.User{
			ID:       userID,
			Name:     "John Doe",
			Email:    req.Email,
			Password: hashedPassword,
			Phone:    req.Phone,
			TenantID: tenantID,
			Role:     "admin",
			IsActive: pgtype.Bool{Bool: true, Valid: true},
		}, nil)

		resp, err := authService.Register(context.Background(), req)

		require.NoError(t, err)
		require.NotNil(t, resp)
		assert.NotEmpty(t, resp.Token)
		assert.NotEmpty(t, resp.RefreshToken)
		assert.Equal(t, userID, resp.User.ID)
		assert.Equal(t, "John Doe", resp.User.Name)
		assert.Equal(t, req.Email, resp.User.Email)

		mockQueries.AssertExpectations(t)
		mockValidator.AssertExpectations(t)
	})

	t.Run("password validation fails", func(t *testing.T) {
		req := RegisterRequest{
			Email:    "test@example.com",
			Password: "weak",
		}

		mockValidator.On("ValidatePassword", req.Password).
			Return(errors.New("password too weak"))

		resp, err := authService.Register(context.Background(), req)

		assert.Error(t, err)
		assert.Nil(t, resp)
		assert.Contains(t, err.Error(), "password too weak")

		mockValidator.AssertExpectations(t)
	})

	t.Run("user already exists", func(t *testing.T) {
		req := RegisterRequest{
			Email:    "existing@example.com",
			Password: "StrongPassword123!",
		}

		mockValidator.On("ValidatePassword", req.Password).Return(nil)

		// Mock user already exists
		mockQueries.On("GetUserByEmail", mock.Anything, "existing@example.com").
			Return(db.User{ID: uuid.New()}, nil)

		resp, err := authService.Register(context.Background(), req)

		assert.Error(t, err)
		assert.Nil(t, resp)
		assert.Contains(t, err.Error(), "user already exists")

		mockQueries.AssertExpectations(t)
		mockValidator.AssertExpectations(t)
	})

	t.Run("tenant creation fails", func(t *testing.T) {
		req := RegisterRequest{
			Email:       "test@example.com",
			Password:    "StrongPassword123!",
			CompanyName: "Test Company",
		}

		mockValidator.On("ValidatePassword", req.Password).Return(nil)
		mockQueries.On("GetUserByEmail", mock.Anything, "test@example.com").
			Return(db.User{}, sql.ErrNoRows)
		mockQueries.On("CreateTenant", mock.Anything, mock.Anything).
			Return(db.Tenant{}, errors.New("database error"))

		resp, err := authService.Register(context.Background(), req)

		assert.Error(t, err)
		assert.Nil(t, resp)
		assert.Contains(t, err.Error(), "failed to create tenant")

		mockQueries.AssertExpectations(t)
		mockValidator.AssertExpectations(t)
	})
}

func TestAuthService_Login(t *testing.T) {
	mockQueries := &MockQueries{}
	jwtService := NewJWTService("test-secret")
	authService := &AuthService{
		queries: mockQueries,
		jwt:     jwtService,
	}

	userID := uuid.New()
	tenantID := uuid.New()
	email := "test@example.com"
	password := "TestPassword123!"
	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)

	t.Run("successful login", func(t *testing.T) {
		req := LoginRequest{
			Email:    email,
			Password: password,
		}

		user := db.User{
			ID:       userID,
			Name:     "Test User",
			Email:    email,
			Password: string(hashedPassword),
			TenantID: tenantID,
			Role:     "admin",
			IsActive: pgtype.Bool{Bool: true, Valid: true},
		}

		mockQueries.On("GetUserByEmail", mock.Anything, email).Return(user, nil)

		resp, err := authService.Login(context.Background(), req)

		require.NoError(t, err)
		require.NotNil(t, resp)
		assert.NotEmpty(t, resp.Token)
		assert.NotEmpty(t, resp.RefreshToken)
		assert.Equal(t, userID, resp.User.ID)
		assert.Equal(t, email, resp.User.Email)

		// Verify JWT token contains correct claims
		claims, err := jwtService.ValidateToken(resp.Token)
		require.NoError(t, err)
		assert.Equal(t, userID.String(), claims.UserID)
		assert.Equal(t, tenantID.String(), claims.TenantID)
		assert.Equal(t, email, claims.Email)
		assert.Equal(t, "admin", claims.Role)

		mockQueries.AssertExpectations(t)
	})

	t.Run("user not found", func(t *testing.T) {
		req := LoginRequest{
			Email:    "nonexistent@example.com",
			Password: password,
		}

		mockQueries.On("GetUserByEmail", mock.Anything, "nonexistent@example.com").
			Return(db.User{}, sql.ErrNoRows)

		resp, err := authService.Login(context.Background(), req)

		assert.Error(t, err)
		assert.Nil(t, resp)
		assert.Equal(t, "invalid credentials", err.Error())

		mockQueries.AssertExpectations(t)
	})

	t.Run("wrong password", func(t *testing.T) {
		req := LoginRequest{
			Email:    email,
			Password: "WrongPassword123!",
		}

		user := db.User{
			ID:       userID,
			Email:    email,
			Password: string(hashedPassword),
			IsActive: pgtype.Bool{Bool: true, Valid: true},
		}

		mockQueries.On("GetUserByEmail", mock.Anything, email).Return(user, nil)

		resp, err := authService.Login(context.Background(), req)

		assert.Error(t, err)
		assert.Nil(t, resp)
		assert.Equal(t, "invalid credentials", err.Error())

		mockQueries.AssertExpectations(t)
	})

	t.Run("inactive user", func(t *testing.T) {
		req := LoginRequest{
			Email:    email,
			Password: password,
		}

		user := db.User{
			ID:       userID,
			Email:    email,
			Password: string(hashedPassword),
			IsActive: pgtype.Bool{Bool: false, Valid: true},
		}

		mockQueries.On("GetUserByEmail", mock.Anything, email).Return(user, nil)

		resp, err := authService.Login(context.Background(), req)

		assert.Error(t, err)
		assert.Nil(t, resp)
		assert.Equal(t, "account is deactivated", err.Error())

		mockQueries.AssertExpectations(t)
	})

	t.Run("database error", func(t *testing.T) {
		req := LoginRequest{
			Email:    email,
			Password: password,
		}

		mockQueries.On("GetUserByEmail", mock.Anything, email).
			Return(db.User{}, errors.New("database connection failed"))

		resp, err := authService.Login(context.Background(), req)

		assert.Error(t, err)
		assert.Nil(t, resp)
		assert.Equal(t, "invalid credentials", err.Error())

		mockQueries.AssertExpectations(t)
	})

	t.Run("email normalization", func(t *testing.T) {
		req := LoginRequest{
			Email:    "  TEST@EXAMPLE.COM  ",
			Password: password,
		}

		user := db.User{
			ID:       userID,
			Email:    "test@example.com", // Normalized email in database
			Password: string(hashedPassword),
			IsActive: pgtype.Bool{Bool: true, Valid: true},
		}

		mockQueries.On("GetUserByEmail", mock.Anything, "test@example.com").Return(user, nil)

		resp, err := authService.Login(context.Background(), req)

		require.NoError(t, err)
		assert.NotNil(t, resp)

		mockQueries.AssertExpectations(t)
	})
}

func TestAuthService_GetUserByID(t *testing.T) {
	mockQueries := &MockQueries{}
	authService := &AuthService{queries: mockQueries}

	userID := uuid.New()

	t.Run("user found", func(t *testing.T) {
		expectedUser := db.GetUserByIDRow{
			ID:    userID,
			Name:  "Test User",
			Email: "test@example.com",
		}

		mockQueries.On("GetUserByID", mock.Anything, userID).
			Return(expectedUser, nil)

		user, err := authService.GetUserByID(context.Background(), userID)

		require.NoError(t, err)
		assert.Equal(t, userID, user.ID)
		assert.Equal(t, "Test User", user.Name)
		assert.Equal(t, "test@example.com", user.Email)

		mockQueries.AssertExpectations(t)
	})

	t.Run("user not found", func(t *testing.T) {
		mockQueries.On("GetUserByID", mock.Anything, userID).
			Return(db.GetUserByIDRow{}, sql.ErrNoRows)

		user, err := authService.GetUserByID(context.Background(), userID)

		assert.Error(t, err)
		assert.Nil(t, user)
		assert.Contains(t, err.Error(), "user not found")

		mockQueries.AssertExpectations(t)
	})

	t.Run("database error", func(t *testing.T) {
		mockQueries.On("GetUserByID", mock.Anything, userID).
			Return(db.GetUserByIDRow{}, errors.New("connection failed"))

		user, err := authService.GetUserByID(context.Background(), userID)

		assert.Error(t, err)
		assert.Nil(t, user)

		mockQueries.AssertExpectations(t)
	})
}

func TestAuthService_RefreshToken(t *testing.T) {
	mockQueries := &MockQueries{}
	jwtService := NewJWTService("test-secret")
	authService := &AuthService{
		queries: mockQueries,
		jwt:     jwtService,
	}

	userID := uuid.New()
	tenantID := uuid.New()

	t.Run("successful token refresh", func(t *testing.T) {
		// Generate a valid refresh token
		refreshToken, err := jwtService.GenerateRefreshToken(userID.String())
		require.NoError(t, err)

		req := RefreshTokenRequest{
			RefreshToken: refreshToken,
		}

		user := db.GetUserByIDRow{
			ID:       userID,
			Name:     "Test User",
			Email:    "test@example.com",
			TenantID: tenantID,
			Role:     "admin",
		}

		mockQueries.On("GetUserByID", mock.Anything, userID).Return(user, nil)

		resp, err := authService.RefreshToken(context.Background(), req)

		require.NoError(t, err)
		require.NotNil(t, resp)
		assert.NotEmpty(t, resp.Token)
		assert.NotEmpty(t, resp.RefreshToken)

		// Verify new token has correct claims
		claims, err := jwtService.ValidateToken(resp.Token)
		require.NoError(t, err)
		assert.Equal(t, userID.String(), claims.UserID)
		assert.Equal(t, tenantID.String(), claims.TenantID)

		mockQueries.AssertExpectations(t)
	})

	t.Run("invalid refresh token", func(t *testing.T) {
		req := RefreshTokenRequest{
			RefreshToken: "invalid-token",
		}

		resp, err := authService.RefreshToken(context.Background(), req)

		assert.Error(t, err)
		assert.Nil(t, resp)
		assert.Contains(t, err.Error(), "invalid refresh token")
	})

	t.Run("user not found", func(t *testing.T) {
		refreshToken, err := jwtService.GenerateRefreshToken(userID.String())
		require.NoError(t, err)

		req := RefreshTokenRequest{
			RefreshToken: refreshToken,
		}

		mockQueries.On("GetUserByID", mock.Anything, userID).
			Return(db.GetUserByIDRow{}, sql.ErrNoRows)

		resp, err := authService.RefreshToken(context.Background(), req)

		assert.Error(t, err)
		assert.Nil(t, resp)
		assert.Contains(t, err.Error(), "user not found")

		mockQueries.AssertExpectations(t)
	})

	t.Run("expired refresh token", func(t *testing.T) {
		// Create an expired refresh token
		expiredClaims := &RefreshClaims{
			UserID: userID.String(),
			RegisteredClaims: jwt.RegisteredClaims{
				ExpiresAt: jwt.NewNumericDate(time.Now().Add(-time.Hour)),
				IssuedAt:  jwt.NewNumericDate(time.Now().Add(-2 * time.Hour)),
				NotBefore: jwt.NewNumericDate(time.Now().Add(-2 * time.Hour)),
			},
		}

		token := jwt.NewWithClaims(jwt.SigningMethodHS256, expiredClaims)
		expiredToken, err := token.SignedString(jwtService.secretKey)
		require.NoError(t, err)

		req := RefreshTokenRequest{
			RefreshToken: expiredToken,
		}

		resp, err := authService.RefreshToken(context.Background(), req)

		assert.Error(t, err)
		assert.Nil(t, resp)
		assert.Contains(t, err.Error(), "invalid refresh token")
	})
}

func TestAuthService_ValidateToken(t *testing.T) {
	jwtService := NewJWTService("test-secret")
	authService := &AuthService{jwt: jwtService}

	userID := uuid.New().String()
	tenantID := uuid.New().String()
	email := "test@example.com"
	role := "admin"

	t.Run("valid token", func(t *testing.T) {
		token, err := jwtService.GenerateToken(userID, tenantID, email, role)
		require.NoError(t, err)

		claims, err := authService.ValidateToken(token)

		require.NoError(t, err)
		assert.Equal(t, userID, claims.UserID)
		assert.Equal(t, tenantID, claims.TenantID)
		assert.Equal(t, email, claims.Email)
		assert.Equal(t, role, claims.Role)
	})

	t.Run("invalid token", func(t *testing.T) {
		claims, err := authService.ValidateToken("invalid-token")

		assert.Error(t, err)
		assert.Nil(t, claims)
	})

	t.Run("empty token", func(t *testing.T) {
		claims, err := authService.ValidateToken("")

		assert.Error(t, err)
		assert.Nil(t, claims)
	})
}

func TestAuthService_UpdatePassword(t *testing.T) {
	mockQueries := &MockQueries{}
	mockValidator := &MockPasswordValidator{}
	authService := &AuthService{
		queries:           mockQueries,
		passwordValidator: mockValidator,
	}

	userID := uuid.New()
	oldPassword := "OldPassword123!"
	newPassword := "NewPassword123!"
	hashedOldPassword, _ := bcrypt.GenerateFromPassword([]byte(oldPassword), bcrypt.DefaultCost)

	t.Run("successful password update", func(t *testing.T) {
		req := UpdatePasswordRequest{
			UserID:          userID,
			CurrentPassword: oldPassword,
			NewPassword:     newPassword,
		}

		user := db.GetUserByIDRow{
			ID:       userID,
			Password: string(hashedOldPassword),
		}

		mockQueries.On("GetUserByID", mock.Anything, userID).Return(user, nil)
		mockValidator.On("ValidatePassword", newPassword).Return(nil)
		mockQueries.On("UpdateUserPassword", mock.Anything, mock.MatchedBy(func(arg db.UpdateUserPasswordParams) bool {
			return arg.ID == userID && len(arg.Password) > 0
		})).Return(nil)

		err := authService.UpdatePassword(context.Background(), req)

		require.NoError(t, err)

		mockQueries.AssertExpectations(t)
		mockValidator.AssertExpectations(t)
	})

	t.Run("wrong current password", func(t *testing.T) {
		req := UpdatePasswordRequest{
			UserID:          userID,
			CurrentPassword: "WrongPassword123!",
			NewPassword:     newPassword,
		}

		user := db.GetUserByIDRow{
			ID:       userID,
			Password: string(hashedOldPassword),
		}

		mockQueries.On("GetUserByID", mock.Anything, userID).Return(user, nil)

		err := authService.UpdatePassword(context.Background(), req)

		assert.Error(t, err)
		assert.Equal(t, "current password is incorrect", err.Error())

		mockQueries.AssertExpectations(t)
	})

	t.Run("new password validation fails", func(t *testing.T) {
		req := UpdatePasswordRequest{
			UserID:          userID,
			CurrentPassword: oldPassword,
			NewPassword:     "weak",
		}

		user := db.GetUserByIDRow{
			ID:       userID,
			Password: string(hashedOldPassword),
		}

		mockQueries.On("GetUserByID", mock.Anything, userID).Return(user, nil)
		mockValidator.On("ValidatePassword", "weak").
			Return(errors.New("password too weak"))

		err := authService.UpdatePassword(context.Background(), req)

		assert.Error(t, err)
		assert.Contains(t, err.Error(), "password too weak")

		mockQueries.AssertExpectations(t)
		mockValidator.AssertExpectations(t)
	})

	t.Run("user not found", func(t *testing.T) {
		req := UpdatePasswordRequest{
			UserID:          userID,
			CurrentPassword: oldPassword,
			NewPassword:     newPassword,
		}

		mockQueries.On("GetUserByID", mock.Anything, userID).
			Return(db.GetUserByIDRow{}, sql.ErrNoRows)

		err := authService.UpdatePassword(context.Background(), req)

		assert.Error(t, err)
		assert.Contains(t, err.Error(), "user not found")

		mockQueries.AssertExpectations(t)
	})

	t.Run("database update fails", func(t *testing.T) {
		req := UpdatePasswordRequest{
			UserID:          userID,
			CurrentPassword: oldPassword,
			NewPassword:     newPassword,
		}

		user := db.GetUserByIDRow{
			ID:       userID,
			Password: string(hashedOldPassword),
		}

		mockQueries.On("GetUserByID", mock.Anything, userID).Return(user, nil)
		mockValidator.On("ValidatePassword", newPassword).Return(nil)
		mockQueries.On("UpdateUserPassword", mock.Anything, mock.Anything).
			Return(errors.New("database error"))

		err := authService.UpdatePassword(context.Background(), req)

		assert.Error(t, err)
		assert.Contains(t, err.Error(), "failed to update password")

		mockQueries.AssertExpectations(t)
		mockValidator.AssertExpectations(t)
	})
}

func TestAuthService_GetUserWithTenant(t *testing.T) {
	mockQueries := &MockQueries{}
	authService := &AuthService{queries: mockQueries}

	userID := uuid.New()
	tenantID := uuid.New()

	t.Run("user and tenant found", func(t *testing.T) {
		user := db.GetUserByIDRow{
			ID:       userID,
			Name:     "Test User",
			Email:    "test@example.com",
			TenantID: tenantID,
		}

		tenant := db.Tenant{
			ID:       tenantID,
			Name:     "Test Tenant",
			Email:    "tenant@example.com",
			IsActive: true,
		}

		mockQueries.On("GetUserByID", mock.Anything, userID).Return(user, nil)
		mockQueries.On("GetTenantByID", mock.Anything, tenantID).Return(tenant, nil)

		result, err := authService.GetUserWithTenant(context.Background(), userID)

		require.NoError(t, err)
		require.NotNil(t, result)
		assert.Equal(t, userID, result.User.ID)
		assert.Equal(t, tenantID, result.Tenant.ID)

		mockQueries.AssertExpectations(t)
	})

	t.Run("user not found", func(t *testing.T) {
		mockQueries.On("GetUserByID", mock.Anything, userID).
			Return(db.GetUserByIDRow{}, sql.ErrNoRows)

		result, err := authService.GetUserWithTenant(context.Background(), userID)

		assert.Error(t, err)
		assert.Nil(t, result)

		mockQueries.AssertExpectations(t)
	})

	t.Run("tenant not found", func(t *testing.T) {
		user := db.GetUserByIDRow{
			ID:       userID,
			TenantID: tenantID,
		}

		mockQueries.On("GetUserByID", mock.Anything, userID).Return(user, nil)
		mockQueries.On("GetTenantByID", mock.Anything, tenantID).
			Return(db.Tenant{}, sql.ErrNoRows)

		result, err := authService.GetUserWithTenant(context.Background(), userID)

		assert.Error(t, err)
		assert.Nil(t, result)

		mockQueries.AssertExpectations(t)
	})
}

func TestEmailNormalization(t *testing.T) {
	testCases := []struct {
		input    string
		expected string
	}{
		{"test@example.com", "test@example.com"},
		{"TEST@EXAMPLE.COM", "test@example.com"},
		{"  test@example.com  ", "test@example.com"},
		{"Test.User@Example.Com", "test.user@example.com"},
		{"user+tag@example.com", "user+tag@example.com"},
	}

	for _, tc := range testCases {
		t.Run("normalize "+tc.input, func(t *testing.T) {
			result := toLowerASCII(trimASCII(tc.input))
			assert.Equal(t, tc.expected, result)
		})
	}
}

func TestPasswordTrimming(t *testing.T) {
	testCases := []struct {
		input    string
		expected string
	}{
		{"password", "password"},
		{"  password  ", "password"},
		{"\tpassword\n", "password"},
		{"\r\npassword\r\n", "password"},
	}

	for _, tc := range testCases {
		t.Run("trim "+tc.input, func(t *testing.T) {
			result := trimASCII(tc.input)
			assert.Equal(t, tc.expected, result)
		})
	}
}

func TestContainsNonASCII(t *testing.T) {
	testCases := []struct {
		input    string
		expected bool
	}{
		{"hello", false},
		{"Hello123!", false},
		{"héllo", true},
		{"hello世界", true},
		{"", false},
		{"français", true},
	}

	for _, tc := range testCases {
		t.Run("check "+tc.input, func(t *testing.T) {
			result := containsNonASCII(tc.input)
			assert.Equal(t, tc.expected, result)
		})
	}
}

// Benchmark tests for performance critical operations
func BenchmarkAuthService_Login(b *testing.B) {
	mockQueries := &MockQueries{}
	jwtService := NewJWTService("benchmark-secret")
	authService := &AuthService{
		queries: mockQueries,
		jwt:     jwtService,
	}

	password := "BenchmarkPassword123!"
	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)

	user := db.User{
		ID:       uuid.New(),
		Email:    "benchmark@example.com",
		Password: string(hashedPassword),
		TenantID: uuid.New(),
		Role:     "admin",
		IsActive: pgtype.Bool{Bool: true, Valid: true},
	}

	mockQueries.On("GetUserByEmail", mock.Anything, mock.Anything).Return(user, nil)

	req := LoginRequest{
		Email:    "benchmark@example.com",
		Password: password,
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, err := authService.Login(context.Background(), req)
		if err != nil {
			b.Fatal(err)
		}
	}
}

func BenchmarkBcryptCompare(b *testing.B) {
	password := "TestPassword123!"
	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		err := bcrypt.CompareHashAndPassword(hashedPassword, []byte(password))
		if err != nil {
			b.Fatal(err)
		}
	}
}
