package handler

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/labstack/echo/v4"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
	"golang.org/x/crypto/bcrypt"

	"agromart2/db"
	internalauth "agromart2/internal/auth"
)

// MockAuthService is a mock implementation of the auth service
type MockAuthService struct {
	mock.Mock
}

func (m *MockAuthService) Register(ctx context.Context, req internalauth.RegisterRequest) (*internalauth.AuthResponse, error) {
	args := m.Called(ctx, req)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*internalauth.AuthResponse), args.Error(1)
}

func (m *MockAuthService) Login(ctx context.Context, req internalauth.LoginRequest) (*internalauth.AuthResponse, error) {
	args := m.Called(ctx, req)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*internalauth.AuthResponse), args.Error(1)
}

func (m *MockAuthService) GetUserByID(ctx context.Context, userID uuid.UUID) (*db.GetUserByIDRow, error) {
	args := m.Called(ctx, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*db.GetUserByIDRow), args.Error(1)
}

func (m *MockAuthService) GetUserWithTenant(ctx context.Context, userID uuid.UUID) (*internalauth.UserWithTenant, error) {
	args := m.Called(ctx, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*internalauth.UserWithTenant), args.Error(1)
}

func (m *MockAuthService) RefreshToken(ctx context.Context, req internalauth.RefreshTokenRequest) (*internalauth.AuthResponse, error) {
	args := m.Called(ctx, req)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*internalauth.AuthResponse), args.Error(1)
}

func (m *MockAuthService) ValidateToken(token string) (*internalauth.Claims, error) {
	args := m.Called(token)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*internalauth.Claims), args.Error(1)
}

func (m *MockAuthService) UpdatePassword(ctx context.Context, req internalauth.UpdatePasswordRequest) error {
	args := m.Called(ctx, req)
	return args.Error(0)
}

func TestAuthHandler_Register(t *testing.T) {
	mockAuthService := &MockAuthService{}
	handler := NewAuthHandler(mockAuthService)

	t.Run("successful registration", func(t *testing.T) {
		e := echo.New()

		requestBody := map[string]interface{}{
			"email":        "test@example.com",
			"password":     "StrongPassword123!",
			"first_name":   "John",
			"last_name":    "Doe",
			"company_name": "Test Company",
			"phone":        "1234567890",
		}

		jsonBody, _ := json.Marshal(requestBody)
		req := httptest.NewRequest(http.MethodPost, "/auth/register", bytes.NewReader(jsonBody))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		userID := uuid.New()
		tenantID := uuid.New()
		hashedPassword, _ := bcrypt.GenerateFromPassword([]byte("StrongPassword123!"), bcrypt.DefaultCost)

		expectedResponse := &internalauth.AuthResponse{
			User: &db.User{
				ID:       userID,
				Name:     "John Doe",
				Email:    "test@example.com",
				Password: string(hashedPassword),
				Phone:    "1234567890",
				TenantID: tenantID,
				Role:     "admin",
				IsActive: pgtype.Bool{Bool: true, Valid: true},
			},
			Token:        "jwt.token.here",
			RefreshToken: "refresh.token.here",
		}

		mockAuthService.On("Register", mock.Anything, mock.MatchedBy(func(req internalauth.RegisterRequest) bool {
			return req.Email == "test@example.com" &&
				req.FirstName == "John" &&
				req.LastName == "Doe" &&
				req.CompanyName == "Test Company"
		})).Return(expectedResponse, nil)

		err := handler.Register(c)

		require.NoError(t, err)
		assert.Equal(t, http.StatusCreated, rec.Code)

		var response map[string]interface{}
		err = json.Unmarshal(rec.Body.Bytes(), &response)
		require.NoError(t, err)

		assert.Contains(t, response, "user")
		assert.Contains(t, response, "token")
		assert.Contains(t, response, "refresh_token")

		mockAuthService.AssertExpectations(t)
	})

	t.Run("invalid request body", func(t *testing.T) {
		e := echo.New()

		req := httptest.NewRequest(http.MethodPost, "/auth/register", strings.NewReader("{invalid json"))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		err := handler.Register(c)

		require.Error(t, err)
		httpErr, ok := err.(*echo.HTTPError)
		require.True(t, ok)
		assert.Equal(t, http.StatusBadRequest, httpErr.Code)
		assert.Equal(t, "invalid request body", httpErr.Message)
	})

	t.Run("missing required fields", func(t *testing.T) {
		e := echo.New()

		requestBody := map[string]interface{}{
			"email": "test@example.com",
			// Missing password and other required fields
		}

		jsonBody, _ := json.Marshal(requestBody)
		req := httptest.NewRequest(http.MethodPost, "/auth/register", bytes.NewReader(jsonBody))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		mockAuthService.On("Register", mock.Anything, mock.Anything).
			Return(nil, errors.New("password is required"))

		err := handler.Register(c)

		require.Error(t, err)
		httpErr, ok := err.(*echo.HTTPError)
		require.True(t, ok)
		assert.Equal(t, http.StatusBadRequest, httpErr.Code)

		mockAuthService.AssertExpectations(t)
	})

	t.Run("user already exists", func(t *testing.T) {
		e := echo.New()

		requestBody := map[string]interface{}{
			"email":        "existing@example.com",
			"password":     "StrongPassword123!",
			"first_name":   "Jane",
			"last_name":    "Doe",
			"company_name": "Existing Company",
		}

		jsonBody, _ := json.Marshal(requestBody)
		req := httptest.NewRequest(http.MethodPost, "/auth/register", bytes.NewReader(jsonBody))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		mockAuthService.On("Register", mock.Anything, mock.Anything).
			Return(nil, errors.New("user already exists"))

		err := handler.Register(c)

		require.Error(t, err)
		httpErr, ok := err.(*echo.HTTPError)
		require.True(t, ok)
		assert.Equal(t, http.StatusBadRequest, httpErr.Code)

		mockAuthService.AssertExpectations(t)
	})

	t.Run("service error", func(t *testing.T) {
		e := echo.New()

		requestBody := map[string]interface{}{
			"email":        "error@example.com",
			"password":     "StrongPassword123!",
			"first_name":   "Error",
			"last_name":    "User",
			"company_name": "Error Company",
		}

		jsonBody, _ := json.Marshal(requestBody)
		req := httptest.NewRequest(http.MethodPost, "/auth/register", bytes.NewReader(jsonBody))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		mockAuthService.On("Register", mock.Anything, mock.Anything).
			Return(nil, errors.New("database connection failed"))

		err := handler.Register(c)

		require.Error(t, err)
		httpErr, ok := err.(*echo.HTTPError)
		require.True(t, ok)
		assert.Equal(t, http.StatusBadRequest, httpErr.Code)

		mockAuthService.AssertExpectations(t)
	})
}

func TestAuthHandler_Login(t *testing.T) {
	mockAuthService := &MockAuthService{}
	handler := NewAuthHandler(mockAuthService)

	t.Run("successful login", func(t *testing.T) {
		e := echo.New()

		requestBody := map[string]interface{}{
			"email":    "test@example.com",
			"password": "TestPassword123!",
		}

		jsonBody, _ := json.Marshal(requestBody)
		req := httptest.NewRequest(http.MethodPost, "/auth/login", bytes.NewReader(jsonBody))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		userID := uuid.New()
		tenantID := uuid.New()

		expectedResponse := &internalauth.AuthResponse{
			User: &db.User{
				ID:       userID,
				Name:     "Test User",
				Email:    "test@example.com",
				TenantID: tenantID,
				Role:     "admin",
				IsActive: pgtype.Bool{Bool: true, Valid: true},
			},
			Token:        "jwt.token.here",
			RefreshToken: "refresh.token.here",
		}

		mockAuthService.On("Login", mock.Anything, mock.MatchedBy(func(req internalauth.LoginRequest) bool {
			return req.Email == "test@example.com" && req.Password == "TestPassword123!"
		})).Return(expectedResponse, nil)

		err := handler.Login(c)

		require.NoError(t, err)
		assert.Equal(t, http.StatusOK, rec.Code)

		var response map[string]interface{}
		err = json.Unmarshal(rec.Body.Bytes(), &response)
		require.NoError(t, err)

		assert.Contains(t, response, "user")
		assert.Contains(t, response, "token")
		assert.Contains(t, response, "refresh_token")

		mockAuthService.AssertExpectations(t)
	})

	t.Run("invalid credentials", func(t *testing.T) {
		e := echo.New()

		requestBody := map[string]interface{}{
			"email":    "wrong@example.com",
			"password": "WrongPassword123!",
		}

		jsonBody, _ := json.Marshal(requestBody)
		req := httptest.NewRequest(http.MethodPost, "/auth/login", bytes.NewReader(jsonBody))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		mockAuthService.On("Login", mock.Anything, mock.Anything).
			Return(nil, errors.New("invalid credentials"))

		err := handler.Login(c)

		require.Error(t, err)
		httpErr, ok := err.(*echo.HTTPError)
		require.True(t, ok)
		assert.Equal(t, http.StatusUnauthorized, httpErr.Code)

		mockAuthService.AssertExpectations(t)
	})

	t.Run("invalid request body", func(t *testing.T) {
		e := echo.New()

		req := httptest.NewRequest(http.MethodPost, "/auth/login", strings.NewReader("{invalid json"))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		err := handler.Login(c)

		require.Error(t, err)
		httpErr, ok := err.(*echo.HTTPError)
		require.True(t, ok)
		assert.Equal(t, http.StatusBadRequest, httpErr.Code)
	})

	t.Run("missing email or password", func(t *testing.T) {
		e := echo.New()

		requestBody := map[string]interface{}{
			"email": "test@example.com",
			// Missing password
		}

		jsonBody, _ := json.Marshal(requestBody)
		req := httptest.NewRequest(http.MethodPost, "/auth/login", bytes.NewReader(jsonBody))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		mockAuthService.On("Login", mock.Anything, mock.Anything).
			Return(nil, errors.New("invalid credentials"))

		err := handler.Login(c)

		require.Error(t, err)
		httpErr, ok := err.(*echo.HTTPError)
		require.True(t, ok)
		assert.Equal(t, http.StatusUnauthorized, httpErr.Code)

		mockAuthService.AssertExpectations(t)
	})

	t.Run("account deactivated", func(t *testing.T) {
		e := echo.New()

		requestBody := map[string]interface{}{
			"email":    "deactivated@example.com",
			"password": "TestPassword123!",
		}

		jsonBody, _ := json.Marshal(requestBody)
		req := httptest.NewRequest(http.MethodPost, "/auth/login", bytes.NewReader(jsonBody))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		mockAuthService.On("Login", mock.Anything, mock.Anything).
			Return(nil, errors.New("account is deactivated"))

		err := handler.Login(c)

		require.Error(t, err)
		httpErr, ok := err.(*echo.HTTPError)
		require.True(t, ok)
		assert.Equal(t, http.StatusUnauthorized, httpErr.Code)

		mockAuthService.AssertExpectations(t)
	})
}

func TestAuthHandler_Me(t *testing.T) {
	mockAuthService := &MockAuthService{}
	handler := NewAuthHandler(mockAuthService)

	userID := uuid.New()
	tenantID := uuid.New()

	t.Run("successful me request with tenant", func(t *testing.T) {
		e := echo.New()

		req := httptest.NewRequest(http.MethodGet, "/auth/me", nil)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		// Simulate middleware setting user_id in context
		c.Set("user_id", userID.String())

		expectedUserWithTenant := &internalauth.UserWithTenant{
			User: &db.GetUserByIDRow{
				ID:       userID,
				Name:     "Test User",
				Email:    "test@example.com",
				TenantID: tenantID,
				Role:     "admin",
			},
			Tenant: &db.Tenant{
				ID:       tenantID,
				Name:     "Test Tenant",
				Email:    "tenant@example.com",
				IsActive: true,
			},
		}

		mockAuthService.On("GetUserWithTenant", mock.Anything, userID).
			Return(expectedUserWithTenant, nil)

		err := handler.Me(c)

		require.NoError(t, err)
		assert.Equal(t, http.StatusOK, rec.Code)

		var response map[string]interface{}
		err = json.Unmarshal(rec.Body.Bytes(), &response)
		require.NoError(t, err)

		assert.True(t, response["success"].(bool))
		assert.Contains(t, response, "data")

		data := response["data"].(map[string]interface{})
		assert.Contains(t, data, "user")
		assert.Contains(t, data, "tenant")

		mockAuthService.AssertExpectations(t)
	})

	t.Run("successful me request without tenant", func(t *testing.T) {
		e := echo.New()

		req := httptest.NewRequest(http.MethodGet, "/auth/me", nil)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		c.Set("user_id", userID.String())

		expectedUser := &db.GetUserByIDRow{
			ID:       userID,
			Name:     "Test User",
			Email:    "test@example.com",
			TenantID: tenantID,
			Role:     "admin",
		}

		mockAuthService.On("GetUserWithTenant", mock.Anything, userID).
			Return(nil, errors.New("tenant not found"))
		mockAuthService.On("GetUserByID", mock.Anything, userID).
			Return(expectedUser, nil)

		err := handler.Me(c)

		require.NoError(t, err)
		assert.Equal(t, http.StatusOK, rec.Code)

		var response map[string]interface{}
		err = json.Unmarshal(rec.Body.Bytes(), &response)
		require.NoError(t, err)

		assert.True(t, response["success"].(bool))
		data := response["data"].(map[string]interface{})
		assert.Contains(t, data, "user")
		assert.NotContains(t, data, "tenant")

		mockAuthService.AssertExpectations(t)
	})

	t.Run("missing user ID in context", func(t *testing.T) {
		e := echo.New()

		req := httptest.NewRequest(http.MethodGet, "/auth/me", nil)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		// No user_id set in context

		err := handler.Me(c)

		require.NoError(t, err)
		assert.Equal(t, http.StatusUnauthorized, rec.Code)

		var response map[string]interface{}
		err = json.Unmarshal(rec.Body.Bytes(), &response)
		require.NoError(t, err)

		assert.False(t, response["success"].(bool))
		assert.Contains(t, response, "error")

		errorData := response["error"].(map[string]interface{})
		assert.Equal(t, "missing user ID", errorData["message"])
	})

	t.Run("invalid user ID format", func(t *testing.T) {
		e := echo.New()

		req := httptest.NewRequest(http.MethodGet, "/auth/me", nil)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		c.Set("user_id", "invalid-uuid")

		err := handler.Me(c)

		require.NoError(t, err)
		assert.Equal(t, http.StatusUnauthorized, rec.Code)

		var response map[string]interface{}
		err = json.Unmarshal(rec.Body.Bytes(), &response)
		require.NoError(t, err)

		assert.False(t, response["success"].(bool))
		errorData := response["error"].(map[string]interface{})
		assert.Equal(t, "invalid user ID", errorData["message"])
	})

	t.Run("user not found", func(t *testing.T) {
		e := echo.New()

		req := httptest.NewRequest(http.MethodGet, "/auth/me", nil)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		c.Set("user_id", userID.String())

		mockAuthService.On("GetUserWithTenant", mock.Anything, userID).
			Return(nil, errors.New("user not found"))
		mockAuthService.On("GetUserByID", mock.Anything, userID).
			Return(nil, sql.ErrNoRows)

		err := handler.Me(c)

		require.NoError(t, err)
		assert.Equal(t, http.StatusNotFound, rec.Code)

		var response map[string]interface{}
		err = json.Unmarshal(rec.Body.Bytes(), &response)
		require.NoError(t, err)

		assert.False(t, response["success"].(bool))
		errorData := response["error"].(map[string]interface{})
		assert.Equal(t, "user not found", errorData["message"])

		mockAuthService.AssertExpectations(t)
	})

	t.Run("empty user_id string in context", func(t *testing.T) {
		e := echo.New()

		req := httptest.NewRequest(http.MethodGet, "/auth/me", nil)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		c.Set("user_id", "")

		err := handler.Me(c)

		require.NoError(t, err)
		assert.Equal(t, http.StatusUnauthorized, rec.Code)

		var response map[string]interface{}
		err = json.Unmarshal(rec.Body.Bytes(), &response)
		require.NoError(t, err)

		assert.False(t, response["success"].(bool))
		errorData := response["error"].(map[string]interface{})
		assert.Equal(t, "missing user ID", errorData["message"])
	})
}

func TestAuthHandler_RefreshToken(t *testing.T) {
	mockAuthService := &MockAuthService{}
	handler := NewAuthHandler(mockAuthService)

	t.Run("successful token refresh", func(t *testing.T) {
		e := echo.New()

		requestBody := map[string]interface{}{
			"refresh_token": "valid.refresh.token",
		}

		jsonBody, _ := json.Marshal(requestBody)
		req := httptest.NewRequest(http.MethodPost, "/auth/refresh", bytes.NewReader(jsonBody))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		userID := uuid.New()
		tenantID := uuid.New()

		expectedResponse := &internalauth.AuthResponse{
			User: &db.User{
				ID:       userID,
				Name:     "Test User",
				Email:    "test@example.com",
				TenantID: tenantID,
				Role:     "admin",
			},
			Token:        "new.jwt.token",
			RefreshToken: "new.refresh.token",
		}

		mockAuthService.On("RefreshToken", mock.Anything, mock.MatchedBy(func(req internalauth.RefreshTokenRequest) bool {
			return req.RefreshToken == "valid.refresh.token"
		})).Return(expectedResponse, nil)

		err := handler.RefreshToken(c)

		require.NoError(t, err)
		assert.Equal(t, http.StatusOK, rec.Code)

		var response map[string]interface{}
		err = json.Unmarshal(rec.Body.Bytes(), &response)
		require.NoError(t, err)

		assert.Contains(t, response, "user")
		assert.Contains(t, response, "token")
		assert.Contains(t, response, "refresh_token")

		mockAuthService.AssertExpectations(t)
	})

	t.Run("invalid refresh token", func(t *testing.T) {
		e := echo.New()

		requestBody := map[string]interface{}{
			"refresh_token": "invalid.refresh.token",
		}

		jsonBody, _ := json.Marshal(requestBody)
		req := httptest.NewRequest(http.MethodPost, "/auth/refresh", bytes.NewReader(jsonBody))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		mockAuthService.On("RefreshToken", mock.Anything, mock.Anything).
			Return(nil, errors.New("invalid refresh token"))

		err := handler.RefreshToken(c)

		require.Error(t, err)
		httpErr, ok := err.(*echo.HTTPError)
		require.True(t, ok)
		assert.Equal(t, http.StatusUnauthorized, httpErr.Code)

		mockAuthService.AssertExpectations(t)
	})

	t.Run("invalid request body", func(t *testing.T) {
		e := echo.New()

		req := httptest.NewRequest(http.MethodPost, "/auth/refresh", strings.NewReader("{invalid json"))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		err := handler.RefreshToken(c)

		require.Error(t, err)
		httpErr, ok := err.(*echo.HTTPError)
		require.True(t, ok)
		assert.Equal(t, http.StatusBadRequest, httpErr.Code)
	})

	t.Run("missing refresh token", func(t *testing.T) {
		e := echo.New()

		requestBody := map[string]interface{}{
			// Missing refresh_token field
		}

		jsonBody, _ := json.Marshal(requestBody)
		req := httptest.NewRequest(http.MethodPost, "/auth/refresh", bytes.NewReader(jsonBody))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		mockAuthService.On("RefreshToken", mock.Anything, mock.Anything).
			Return(nil, errors.New("refresh token is required"))

		err := handler.RefreshToken(c)

		require.Error(t, err)
		httpErr, ok := err.(*echo.HTTPError)
		require.True(t, ok)
		assert.Equal(t, http.StatusUnauthorized, httpErr.Code)

		mockAuthService.AssertExpectations(t)
	})

	t.Run("expired refresh token", func(t *testing.T) {
		e := echo.New()

		requestBody := map[string]interface{}{
			"refresh_token": "expired.refresh.token",
		}

		jsonBody, _ := json.Marshal(requestBody)
		req := httptest.NewRequest(http.MethodPost, "/auth/refresh", bytes.NewReader(jsonBody))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		mockAuthService.On("RefreshToken", mock.Anything, mock.Anything).
			Return(nil, errors.New("refresh token has expired"))

		err := handler.RefreshToken(c)

		require.Error(t, err)
		httpErr, ok := err.(*echo.HTTPError)
		require.True(t, ok)
		assert.Equal(t, http.StatusUnauthorized, httpErr.Code)

		mockAuthService.AssertExpectations(t)
	})
}

func TestAuthHandler_UpdatePassword(t *testing.T) {
	mockAuthService := &MockAuthService{}
	handler := NewAuthHandler(mockAuthService)

	userID := uuid.New()

	t.Run("successful password update", func(t *testing.T) {
		e := echo.New()

		requestBody := map[string]interface{}{
			"current_password": "OldPassword123!",
			"new_password":     "NewPassword123!",
		}

		jsonBody, _ := json.Marshal(requestBody)
		req := httptest.NewRequest(http.MethodPut, "/auth/password", bytes.NewReader(jsonBody))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		c.Set("user_id", userID.String())

		mockAuthService.On("UpdatePassword", mock.Anything, mock.MatchedBy(func(req internalauth.UpdatePasswordRequest) bool {
			return req.UserID == userID &&
				req.CurrentPassword == "OldPassword123!" &&
				req.NewPassword == "NewPassword123!"
		})).Return(nil)

		err := handler.UpdatePassword(c)

		require.NoError(t, err)
		assert.Equal(t, http.StatusOK, rec.Code)

		var response map[string]interface{}
		err = json.Unmarshal(rec.Body.Bytes(), &response)
		require.NoError(t, err)

		assert.True(t, response["success"].(bool))
		assert.Equal(t, "password updated successfully", response["message"])

		mockAuthService.AssertExpectations(t)
	})

	t.Run("wrong current password", func(t *testing.T) {
		e := echo.New()

		requestBody := map[string]interface{}{
			"current_password": "WrongPassword123!",
			"new_password":     "NewPassword123!",
		}

		jsonBody, _ := json.Marshal(requestBody)
		req := httptest.NewRequest(http.MethodPut, "/auth/password", bytes.NewReader(jsonBody))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		c.Set("user_id", userID.String())

		mockAuthService.On("UpdatePassword", mock.Anything, mock.Anything).
			Return(errors.New("current password is incorrect"))

		err := handler.UpdatePassword(c)

		require.Error(t, err)
		httpErr, ok := err.(*echo.HTTPError)
		require.True(t, ok)
		assert.Equal(t, http.StatusBadRequest, httpErr.Code)

		mockAuthService.AssertExpectations(t)
	})

	t.Run("missing user ID in context", func(t *testing.T) {
		e := echo.New()

		requestBody := map[string]interface{}{
			"current_password": "OldPassword123!",
			"new_password":     "NewPassword123!",
		}

		jsonBody, _ := json.Marshal(requestBody)
		req := httptest.NewRequest(http.MethodPut, "/auth/password", bytes.NewReader(jsonBody))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		// No user_id set in context

		err := handler.UpdatePassword(c)

		require.Error(t, err)
		httpErr, ok := err.(*echo.HTTPError)
		require.True(t, ok)
		assert.Equal(t, http.StatusUnauthorized, httpErr.Code)
	})

	t.Run("invalid request body", func(t *testing.T) {
		e := echo.New()

		req := httptest.NewRequest(http.MethodPut, "/auth/password", strings.NewReader("{invalid json"))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		c.Set("user_id", userID.String())

		err := handler.UpdatePassword(c)

		require.Error(t, err)
		httpErr, ok := err.(*echo.HTTPError)
		require.True(t, ok)
		assert.Equal(t, http.StatusBadRequest, httpErr.Code)
	})

	t.Run("weak new password", func(t *testing.T) {
		e := echo.New()

		requestBody := map[string]interface{}{
			"current_password": "OldPassword123!",
			"new_password":     "weak",
		}

		jsonBody, _ := json.Marshal(requestBody)
		req := httptest.NewRequest(http.MethodPut, "/auth/password", bytes.NewReader(jsonBody))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		c.Set("user_id", userID.String())

		mockAuthService.On("UpdatePassword", mock.Anything, mock.Anything).
			Return(errors.New("password does not meet requirements"))

		err := handler.UpdatePassword(c)

		require.Error(t, err)
		httpErr, ok := err.(*echo.HTTPError)
		require.True(t, ok)
		assert.Equal(t, http.StatusBadRequest, httpErr.Code)

		mockAuthService.AssertExpectations(t)
	})

	t.Run("service error", func(t *testing.T) {
		e := echo.New()

		requestBody := map[string]interface{}{
			"current_password": "OldPassword123!",
			"new_password":     "NewPassword123!",
		}

		jsonBody, _ := json.Marshal(requestBody)
		req := httptest.NewRequest(http.MethodPut, "/auth/password", bytes.NewReader(jsonBody))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		c.Set("user_id", userID.String())

		mockAuthService.On("UpdatePassword", mock.Anything, mock.Anything).
			Return(errors.New("database connection failed"))

		err := handler.UpdatePassword(c)

		require.Error(t, err)
		httpErr, ok := err.(*echo.HTTPError)
		require.True(t, ok)
		assert.Equal(t, http.StatusBadRequest, httpErr.Code)

		mockAuthService.AssertExpectations(t)
	})
}

func TestAuthHandler_Logout(t *testing.T) {
	mockAuthService := &MockAuthService{}
	handler := NewAuthHandler(mockAuthService)

	t.Run("successful logout", func(t *testing.T) {
		e := echo.New()

		req := httptest.NewRequest(http.MethodPost, "/auth/logout", nil)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		err := handler.Logout(c)

		require.NoError(t, err)
		assert.Equal(t, http.StatusOK, rec.Code)

		var response map[string]interface{}
		err = json.Unmarshal(rec.Body.Bytes(), &response)
		require.NoError(t, err)

		assert.True(t, response["success"].(bool))
		assert.Equal(t, "logged out successfully", response["message"])
	})
}

func TestAuthHandler_Constructor(t *testing.T) {
	t.Run("handler construction with service", func(t *testing.T) {
		mockAuthService := &MockAuthService{}
		handler := NewAuthHandler(mockAuthService)

		require.NotNil(t, handler)
		assert.Equal(t, mockAuthService, handler.authService)
	})

	t.Run("handler construction with nil service", func(t *testing.T) {
		handler := NewAuthHandler(nil)

		require.NotNil(t, handler)
		assert.Nil(t, handler.authService)
	})
}

func TestAuthHandler_RegisterRoutes(t *testing.T) {
	mockAuthService := &MockAuthService{}
	handler := NewAuthHandler(mockAuthService)

	t.Run("register public routes", func(t *testing.T) {
		e := echo.New()
		group := e.Group("/auth")

		// This should not panic
		assert.NotPanics(t, func() {
			handler.RegisterRoutes(group)
		})
	})
}

func TestAuthHandler_RegisterProtectedRoutes(t *testing.T) {
	mockAuthService := &MockAuthService{}
	handler := NewAuthHandler(mockAuthService)

	t.Run("register protected routes", func(t *testing.T) {
		e := echo.New()
		group := e.Group("/")

		// This should not panic
		assert.NotPanics(t, func() {
			handler.RegisterProtectedRoutes(group)
		})
	})
}

// Integration-style tests that test the full request/response cycle
func TestAuthHandler_Integration(t *testing.T) {
	mockAuthService := &MockAuthService{}
	handler := NewAuthHandler(mockAuthService)

	t.Run("full registration flow", func(t *testing.T) {
		e := echo.New()

		// Setup route
		e.POST("/auth/register", handler.Register)

		requestBody := `{
			"email": "integration@example.com",
			"password": "IntegrationTest123!",
			"first_name": "Integration",
			"last_name": "Test",
			"company_name": "Test Company",
			"phone": "555-0123"
		}`

		userID := uuid.New()
		tenantID := uuid.New()

		expectedResponse := &internalauth.AuthResponse{
			User: &db.User{
				ID:       userID,
				Name:     "Integration Test",
				Email:    "integration@example.com",
				TenantID: tenantID,
				Role:     "admin",
			},
			Token:        "integration.jwt.token",
			RefreshToken: "integration.refresh.token",
		}

		mockAuthService.On("Register", mock.Anything, mock.Anything).
			Return(expectedResponse, nil)

		req := httptest.NewRequest(http.MethodPost, "/auth/register", strings.NewReader(requestBody))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		rec := httptest.NewRecorder()

		e.ServeHTTP(rec, req)

		assert.Equal(t, http.StatusCreated, rec.Code)

		var response map[string]interface{}
		err := json.Unmarshal(rec.Body.Bytes(), &response)
		require.NoError(t, err)

		assert.Contains(t, response, "user")
		assert.Contains(t, response, "token")
		assert.Contains(t, response, "refresh_token")

		mockAuthService.AssertExpectations(t)
	})

	t.Run("full login flow", func(t *testing.T) {
		e := echo.New()

		// Setup route
		e.POST("/auth/login", handler.Login)

		requestBody := `{
			"email": "integration@example.com",
			"password": "IntegrationTest123!"
		}`

		userID := uuid.New()
		tenantID := uuid.New()

		expectedResponse := &internalauth.AuthResponse{
			User: &db.User{
				ID:       userID,
				Name:     "Integration Test",
				Email:    "integration@example.com",
				TenantID: tenantID,
				Role:     "admin",
			},
			Token:        "integration.jwt.token",
			RefreshToken: "integration.refresh.token",
		}

		mockAuthService.On("Login", mock.Anything, mock.Anything).
			Return(expectedResponse, nil)

		req := httptest.NewRequest(http.MethodPost, "/auth/login", strings.NewReader(requestBody))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		rec := httptest.NewRecorder()

		e.ServeHTTP(rec, req)

		assert.Equal(t, http.StatusOK, rec.Code)

		var response map[string]interface{}
		err := json.Unmarshal(rec.Body.Bytes(), &response)
		require.NoError(t, err)

		assert.Contains(t, response, "user")
		assert.Contains(t, response, "token")

		mockAuthService.AssertExpectations(t)
	})
}

// Benchmark tests
func BenchmarkAuthHandler_Login(b *testing.B) {
	mockAuthService := &MockAuthService{}
	handler := NewAuthHandler(mockAuthService)

	userID := uuid.New()
	tenantID := uuid.New()

	expectedResponse := &internalauth.AuthResponse{
		User: &db.User{
			ID:       userID,
			Name:     "Benchmark User",
			Email:    "benchmark@example.com",
			TenantID: tenantID,
			Role:     "admin",
		},
		Token:        "benchmark.jwt.token",
		RefreshToken: "benchmark.refresh.token",
	}

	mockAuthService.On("Login", mock.Anything, mock.Anything).Return(expectedResponse, nil)

	requestBody := `{"email":"benchmark@example.com","password":"BenchmarkPassword123!"}`

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		e := echo.New()
		req := httptest.NewRequest(http.MethodPost, "/auth/login", strings.NewReader(requestBody))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		err := handler.Login(c)
		if err != nil {
			b.Fatal(err)
		}
	}
}
