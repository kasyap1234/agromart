package handler

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/labstack/echo/v4"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/stretchr/testify/suite"

	"agromart2/db"
	"agromart2/internal/auth"
	"agromart2/internal/database"
)

type AuthHandlerTestSuite struct {
	suite.Suite
	dbPool   *sql.DB
	queries  *db.Queries
	jwt      *auth.JWTService
	auth     *auth.AuthService
	handler  *AuthHandler
	echo     *echo.Echo
}

func (suite *AuthHandlerTestSuite) SetupSuite() {
	// Initialize test database connection
	cfg := &database.Config{
		Host:     "localhost",
		Port:     5432,
		User:     "postgres",
		Password: "password",
		Database: "agromart_test",
		SSLMode:  "disable",
	}

	ctx := context.Background()
	pool, err := cfg.NewPool(ctx)
	require.NoError(suite.T(), err)

	suite.dbPool = pool
	suite.queries = db.New(pool)
	suite.jwt = auth.NewJWTService("test-secret")
	suite.auth = auth.NewAuthService(pool, suite.queries, suite.jwt)
	suite.handler = NewAuthHandler(suite.auth)
	suite.echo = echo.New()
}

func (suite *AuthHandlerTestSuite) TearDownSuite() {
	if suite.dbPool != nil {
		suite.dbPool.Close()
	}
}

func (suite *AuthHandlerTestSuite) SetupTest() {
	// Clean up test data before each test
	_, err := suite.dbPool.Exec("TRUNCATE TABLE users, tenants CASCADE")
	require.NoError(suite.T(), err)
}

func (suite *AuthHandlerTestSuite) TestRegister_Success() {
	req := RegisterRequest{
		Email:       "test@example.com",
		Password:    "StrongPassword123!",
		FirstName:   "John",
		LastName:    "Doe",
		CompanyName: "Test Company",
		Phone:       "1234567890",
	}

	body, _ := json.Marshal(req)

	apitest.New().
		Handler(suite.echo).
		Post("/api/auth/register").
		Body(string(body)).
		Header("Content-Type", "application/json").
		Expect(suite.T()).
		Status(http.StatusOK).
		End()
}

func (suite *AuthHandlerTestSuite) TestRegister_ValidationError() {
	req := RegisterRequest{
		Email:    "invalid-email",
		Password: "weak",
	}

	body, _ := json.Marshal(req)

	apitest.New().
		Handler(suite.echo).
		Post("/api/auth/register").
		Body(string(body)).
		Header("Content-Type", "application/json").
		Expect(suite.T()).
		Status(http.StatusBadRequest).
		End()
}

func (suite *AuthHandlerTestSuite) TestLogin_Success() {
	// First register a user
	registerReq := RegisterRequest{
		Email:       "test@example.com",
		Password:    "StrongPassword123!",
		FirstName:   "John",
		LastName:    "Doe",
		CompanyName: "Test Company",
		Phone:       "1234567890",
	}

	body, _ := json.Marshal(registerReq)
	req, _ := http.NewRequest("POST", "/api/auth/register", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	rr := httptest.NewRecorder()
	c := suite.echo.NewContext(req, rr)
	c.SetPath("/api/auth/register")

	err := suite.handler.Register(c)
	require.NoError(suite.T(), err)

	// Now login
	loginReq := LoginRequest{
		Email:    "test@example.com",
		Password: "StrongPassword123!",
	}

	body, _ = json.Marshal(loginReq)

	apitest.New().
		Handler(suite.echo).
		Post("/api/auth/login").
		Body(string(body)).
		Header("Content-Type", "application/json").
		Expect(suite.T()).
		Status(http.StatusOK).
		Assert(jsonpath.Equal("$", map[string]interface{}{
			"success": true,
			"data": map[string]interface{}{
				"token":        jsonpath.Present(),
				"refreshToken": jsonpath.Present(),
				"user":         jsonpath.Present(),
			},
		})).
		End()
}

func (suite *AuthHandlerTestSuite) TestLogin_InvalidCredentials() {
	loginReq := LoginRequest{
		Email:    "nonexistent@example.com",
		Password: "wrongpassword",
	}

	body, _ := json.Marshal(loginReq)

	apitest.New().
		Handler(suite.echo).
		Post("/api/auth/login").
		Body(string(body)).
		Header("Content-Type", "application/json").
		Expect(suite.T()).
		Status(http.StatusUnauthorized).
		Assert(jsonpath.Equal("$.success", false)).
		End()
}

func (suite *AuthHandlerTestSuite) TestRefreshToken_Success() {
	// First login to get tokens
	registerReq := RegisterRequest{
		Email:       "test@example.com",
		Password:    "StrongPassword123!",
		FirstName:   "John",
		LastName:    "Doe",
		CompanyName: "Test Company",
		Phone:       "1234567890",
	}

	body, _ := json.Marshal(registerReq)
	req, _ := http.NewRequest("POST", "/api/auth/register", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	rr := httptest.NewRecorder()
	c := suite.echo.NewContext(req, rr)
	c.SetPath("/api/auth/register")

	err := suite.handler.Register(c)
	require.NoError(suite.T(), err)

	// Login to get tokens
	loginReq := LoginRequest{
		Email:    "test@example.com",
		Password: "StrongPassword123!",
	}

	body, _ = json.Marshal(loginReq)
	req, _ = http.NewRequest("POST", "/api/auth/login", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	rr = httptest.NewRecorder()
	c = suite.echo.NewContext(req, rr)
	c.SetPath("/api/auth/login")

	err = suite.handler.Login(c)
	require.NoError(suite.T(), err)

	var loginResp LoginResponse
	err = json.Unmarshal(rr.Body.Bytes(), &loginResp)
	require.NoError(suite.T(), err)

	// Now test refresh token
	refreshReq := RefreshTokenRequest{
		RefreshToken: loginResp.Data.RefreshToken,
	}

	body, _ = json.Marshal(refreshReq)

	apitest.New().
		Handler(suite.echo).
		Post("/api/auth/refresh").
		Body(string(body)).
		Header("Content-Type", "application/json").
		Expect(suite.T()).
		Status(http.StatusOK).
		Assert(jsonpath.Equal("$", map[string]interface{}{
			"success": true,
			"data": map[string]interface{}{
				"token":        jsonpath.Present(),
				"refreshToken": jsonpath.Present(),
			},
		})).
		End()
}

func (suite *AuthHandlerTestSuite) TestLogout_Success() {
	apitest.New().
		Handler(suite.echo).
		Post("/api/auth/logout").
		Header("Content-Type", "application/json").
		Expect(suite.T()).
		Status(http.StatusOK).
		Assert(jsonpath.Equal("$.success", true)).
		End()
}

func (suite *AuthHandlerTestSuite) TestHealth_Endpoint() {
	apitest.New().
		Handler(suite.echo).
		Get("/api/health").
		Expect(suite.T()).
		Status(http.StatusOK).
		Assert(jsonpath.Equal("$", map[string]interface{}{
			"service": "agromart-api",
			"status":  "ok",
		})).
		End()
}

// Benchmark tests
func BenchmarkAuthHandler_Login(b *testing.B) {
	// Setup benchmark
	cfg := &database.Config{
		Host:     "localhost",
		Port:     5432,
		User:     "postgres",
		Password: "password",
		Database: "agromart_test",
		SSLMode:  "disable",
	}

	ctx := context.Background()
	pool, err := cfg.NewPool(ctx)
	if err != nil {
		b.Fatal(err)
	}
	defer pool.Close()

	queries := db.New(pool)
	jwtService := auth.NewJWTService("test-secret")
	authService := auth.NewAuthService(pool, queries, jwtService)
	handler := NewAuthHandler(authService)
	echo := echo.New()

	loginReq := LoginRequest{
		Email:    "benchmark@example.com",
		Password: "BenchmarkPassword123!",
	}

	body, _ := json.Marshal(loginReq)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		req, _ := http.NewRequest("POST", "/api/auth/login", bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")

		rr := httptest.NewRecorder()
		c := echo.NewContext(req, rr)
		c.SetPath("/api/auth/login")

		err := handler.Login(c)
		if err != nil {
			b.Fatal(err)
		}
	}
}

func TestAuthHandlerTestSuite(t *testing.T) {
	suite.Run(t, new(AuthHandlerTestSuite))
}