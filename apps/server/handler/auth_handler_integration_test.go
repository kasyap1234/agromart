package handler

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/labstack/echo/v4"
	"github.com/stretchr/testify/require"
	"github.com/stretchr/testify/suite"

	"agromart2/internal/auth"
	"agromart2/apps/server/testutil"
)

type AuthHandlerTestSuite struct {
	suite.Suite
	testDB   *testutil.TestDatabase
	jwt      *auth.JWTService
	auth     *auth.AuthService
	handler  *AuthHandler
	echo     *echo.Echo
}

func (suite *AuthHandlerTestSuite) SetupSuite() {
	// Initialize test database
	testDB, err := testutil.NewTestDatabase()
	require.NoError(suite.T(), err)

	suite.testDB = testDB
	suite.jwt = auth.NewJWTService("test-secret")
	suite.auth = auth.NewAuthService(testDB.Pool, testDB.Queries, suite.jwt)
	suite.handler = NewAuthHandler(suite.auth)
	suite.echo = echo.New()
	
	// Register routes
	suite.handler.RegisterRoutes(suite.echo)
}

func (suite *AuthHandlerTestSuite) TearDownSuite() {
	if suite.testDB != nil {
		suite.testDB.Close()
	}
}

func (suite *AuthHandlerTestSuite) SetupTest() {
	// Clean up test data before each test
	err := suite.testDB.TruncateAll(context.Background())
	require.NoError(suite.T(), err)
}

func (suite *AuthHandlerTestSuite) TestRegister_Success() {
	req := auth.RegisterRequest{
		Email:       "test@example.com",
		Password:    "StrongPassword123!",
		FirstName:   "John",
		LastName:    "Doe",
		CompanyName: "Test Company",
		Phone:       "1234567890",
	}

	body, _ := json.Marshal(req)
	httpReq := httptest.NewRequest(http.MethodPost, "/api/auth/register", bytes.NewReader(body))
	httpReq.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	suite.echo.ServeHTTP(rec, httpReq)

	require.Equal(suite.T(), http.StatusCreated, rec.Code)

	var response map[string]interface{}
	err := json.Unmarshal(rec.Body.Bytes(), &response)
	require.NoError(suite.T(), err)
	require.Contains(suite.T(), response, "user")
	require.Contains(suite.T(), response, "token")
	require.Contains(suite.T(), response, "refresh_token")
}

func (suite *AuthHandlerTestSuite) TestRegister_ValidationError() {
	req := auth.RegisterRequest{
		Email:    "invalid-email",
		Password: "weak",
	}

	body, _ := json.Marshal(req)
	httpReq := httptest.NewRequest(http.MethodPost, "/api/auth/register", bytes.NewReader(body))
	httpReq.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	suite.echo.ServeHTTP(rec, httpReq)

	require.Equal(suite.T(), http.StatusInternalServerError, rec.Code) // Auth service validation returns 500
}

func (suite *AuthHandlerTestSuite) TestLogin_Success() {
	// First register a user
	registerReq := auth.RegisterRequest{
		Email:       "test@example.com",
		Password:    "StrongPassword123!",
		FirstName:   "John",
		LastName:    "Doe",
		CompanyName: "Test Company",
		Phone:       "1234567890",
	}

	body, _ := json.Marshal(registerReq)
	httpReq := httptest.NewRequest(http.MethodPost, "/api/auth/register", bytes.NewReader(body))
	httpReq.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	suite.echo.ServeHTTP(rec, httpReq)
	require.Equal(suite.T(), http.StatusCreated, rec.Code)

	// Now login
	loginReq := auth.LoginRequest{
		Email:    "test@example.com",
		Password: "StrongPassword123!",
	}

	body, _ = json.Marshal(loginReq)
	httpReq = httptest.NewRequest(http.MethodPost, "/api/auth/login", bytes.NewReader(body))
	httpReq.Header.Set("Content-Type", "application/json")
	rec = httptest.NewRecorder()

	suite.echo.ServeHTTP(rec, httpReq)

	require.Equal(suite.T(), http.StatusOK, rec.Code)

	var response map[string]interface{}
	err := json.Unmarshal(rec.Body.Bytes(), &response)
	require.NoError(suite.T(), err)
	require.Contains(suite.T(), response, "user")
	require.Contains(suite.T(), response, "token")
	require.Contains(suite.T(), response, "refresh_token")
}

func (suite *AuthHandlerTestSuite) TestLogin_InvalidCredentials() {
	loginReq := auth.LoginRequest{
		Email:    "nonexistent@example.com",
		Password: "wrongpassword",
	}

	body, _ := json.Marshal(loginReq)
	httpReq := httptest.NewRequest(http.MethodPost, "/api/auth/login", bytes.NewReader(body))
	httpReq.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	suite.echo.ServeHTTP(rec, httpReq)

	require.Equal(suite.T(), http.StatusUnauthorized, rec.Code)
}

func (suite *AuthHandlerTestSuite) TestLogout_Success() {
	httpReq := httptest.NewRequest(http.MethodPost, "/api/auth/logout", nil)
	httpReq.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	suite.echo.ServeHTTP(rec, httpReq)

	require.Equal(suite.T(), http.StatusOK, rec.Code)

	var response map[string]interface{}
	err := json.Unmarshal(rec.Body.Bytes(), &response)
	require.NoError(suite.T(), err)
	require.True(suite.T(), response["success"].(bool))
}

func TestAuthHandlerTestSuite(t *testing.T) {
	suite.Run(t, new(AuthHandlerTestSuite))
}