package auth

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNewMiddleware(t *testing.T) {
	authService := &AuthService{}
	middleware := NewMiddleware(authService)

	assert.NotNil(t, middleware)
	assert.Equal(t, authService, middleware.authService)
}

func TestMiddleware_RequireAuth(t *testing.T) {
	jwtService := NewJWTService("test-secret")
	authService := &AuthService{jwt: jwtService}
	middleware := NewMiddleware(authService)

	userID := "11111111-1111-1111-1111-111111111111"
	tenantID := "22222222-2222-2222-2222-222222222222"
	email := "test@example.com"
	role := "admin"

	t.Run("successful authentication with valid token", func(t *testing.T) {
		e := echo.New()

		token, err := jwtService.GenerateToken(userID, tenantID, email, role)
		require.NoError(t, err)

		req := httptest.NewRequest(http.MethodGet, "/protected", nil)
		req.Header.Set("Authorization", "Bearer "+token)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		handlerCalled := false
		nextHandler := func(c echo.Context) error {
			handlerCalled = true

			// Verify Echo context values are set
			assert.Equal(t, userID, c.Get("user_id"))
			assert.Equal(t, tenantID, c.Get("tenant_id"))
			assert.Equal(t, role, c.Get("user_role"))
			assert.Equal(t, email, c.Get("user_email"))

			// Verify request context values are set
			ctx := c.Request().Context()
			assert.Equal(t, userID, GetUserID(ctx))
			assert.Equal(t, tenantID, GetTenantID(ctx))
			assert.Equal(t, role, GetRole(ctx))
			assert.Equal(t, email, GetEmail(ctx))

			return c.JSON(http.StatusOK, map[string]string{"status": "success"})
		}

		err = middleware.RequireAuth(nextHandler)(c)

		require.NoError(t, err)
		assert.True(t, handlerCalled)
		assert.Equal(t, http.StatusOK, rec.Code)

		// Verify auth timing header is set
		assert.NotEmpty(t, rec.Header().Get("X-Auth-Time"))
	})

	t.Run("missing authorization header", func(t *testing.T) {
		e := echo.New()

		req := httptest.NewRequest(http.MethodGet, "/protected", nil)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		handlerCalled := false
		nextHandler := func(c echo.Context) error {
			handlerCalled = true
			return nil
		}

		err := middleware.RequireAuth(nextHandler)(c)

		assert.NoError(t, err) // Middleware handles error internally
		assert.False(t, handlerCalled)
		assert.Equal(t, http.StatusUnauthorized, rec.Code)
		assert.Equal(t, "missing_header", rec.Header().Get("X-Auth-Debug"))

		// Verify response body
		expectedResponse := `{"success":false,"error":{"code":401,"message":"missing authorization header"}}`
		assert.JSONEq(t, expectedResponse, rec.Body.String())
	})

	t.Run("empty authorization header", func(t *testing.T) {
		e := echo.New()

		req := httptest.NewRequest(http.MethodGet, "/protected", nil)
		req.Header.Set("Authorization", "")
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		handlerCalled := false
		nextHandler := func(c echo.Context) error {
			handlerCalled = true
			return nil
		}

		err := middleware.RequireAuth(nextHandler)(c)

		assert.NoError(t, err)
		assert.False(t, handlerCalled)
		assert.Equal(t, http.StatusUnauthorized, rec.Code)
		assert.Equal(t, "missing_header", rec.Header().Get("X-Auth-Debug"))
	})

	t.Run("invalid authorization header format - missing Bearer", func(t *testing.T) {
		e := echo.New()

		req := httptest.NewRequest(http.MethodGet, "/protected", nil)
		req.Header.Set("Authorization", "InvalidTokenFormat")
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		handlerCalled := false
		nextHandler := func(c echo.Context) error {
			handlerCalled = true
			return nil
		}

		err := middleware.RequireAuth(nextHandler)(c)

		assert.NoError(t, err)
		assert.False(t, handlerCalled)
		assert.Equal(t, http.StatusUnauthorized, rec.Code)
		assert.Equal(t, "bad_format", rec.Header().Get("X-Auth-Debug"))

		expectedResponse := `{"success":false,"error":{"code":401,"message":"invalid authorization header format"}}`
		assert.JSONEq(t, expectedResponse, rec.Body.String())
	})

	t.Run("invalid authorization header format - Basic auth", func(t *testing.T) {
		e := echo.New()

		req := httptest.NewRequest(http.MethodGet, "/protected", nil)
		req.Header.Set("Authorization", "Basic dXNlcjpwYXNzd29yZA==")
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		handlerCalled := false
		nextHandler := func(c echo.Context) error {
			handlerCalled = true
			return nil
		}

		err := middleware.RequireAuth(nextHandler)(c)

		assert.NoError(t, err)
		assert.False(t, handlerCalled)
		assert.Equal(t, http.StatusUnauthorized, rec.Code)
		assert.Equal(t, "bad_format", rec.Header().Get("X-Auth-Debug"))
	})

	t.Run("invalid JWT token", func(t *testing.T) {
		e := echo.New()

		req := httptest.NewRequest(http.MethodGet, "/protected", nil)
		req.Header.Set("Authorization", "Bearer invalid.jwt.token")
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		handlerCalled := false
		nextHandler := func(c echo.Context) error {
			handlerCalled = true
			return nil
		}

		err := middleware.RequireAuth(nextHandler)(c)

		assert.NoError(t, err)
		assert.False(t, handlerCalled)
		assert.Equal(t, http.StatusUnauthorized, rec.Code)
		assert.Equal(t, "invalid_token", rec.Header().Get("X-Auth-Debug"))

		expectedResponse := `{"success":false,"error":{"code":401,"message":"invalid token"}}`
		assert.JSONEq(t, expectedResponse, rec.Body.String())
	})

	t.Run("expired JWT token", func(t *testing.T) {
		e := echo.New()

		// Create expired token
		expiredClaims := &Claims{
			UserID:   userID,
			TenantID: tenantID,
			Email:    email,
			Role:     role,
			RegisteredClaims: jwt.RegisteredClaims{
				ExpiresAt: jwt.NewNumericDate(time.Now().Add(-time.Hour)),
				IssuedAt:  jwt.NewNumericDate(time.Now().Add(-2 * time.Hour)),
				NotBefore: jwt.NewNumericDate(time.Now().Add(-2 * time.Hour)),
			},
		}

		token := jwt.NewWithClaims(jwt.SigningMethodHS256, expiredClaims)
		expiredToken, err := token.SignedString(jwtService.secretKey)
		require.NoError(t, err)

		req := httptest.NewRequest(http.MethodGet, "/protected", nil)
		req.Header.Set("Authorization", "Bearer "+expiredToken)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		handlerCalled := false
		nextHandler := func(c echo.Context) error {
			handlerCalled = true
			return nil
		}

		err = middleware.RequireAuth(nextHandler)(c)

		assert.NoError(t, err)
		assert.False(t, handlerCalled)
		assert.Equal(t, http.StatusUnauthorized, rec.Code)
		assert.Equal(t, "invalid_token", rec.Header().Get("X-Auth-Debug"))
	})

	t.Run("public path bypass", func(t *testing.T) {
		e := echo.New()

		// Test health endpoint
		req := httptest.NewRequest(http.MethodGet, "/health", nil)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		handlerCalled := false
		nextHandler := func(c echo.Context) error {
			handlerCalled = true
			return c.JSON(http.StatusOK, map[string]string{"status": "ok"})
		}

		err := middleware.RequireAuth(nextHandler)(c)

		require.NoError(t, err)
		assert.True(t, handlerCalled)
		assert.Equal(t, http.StatusOK, rec.Code)
	})

	t.Run("token with wrong secret", func(t *testing.T) {
		e := echo.New()

		// Create token with different secret
		wrongJWT := NewJWTService("wrong-secret")
		token, err := wrongJWT.GenerateToken(userID, tenantID, email, role)
		require.NoError(t, err)

		req := httptest.NewRequest(http.MethodGet, "/protected", nil)
		req.Header.Set("Authorization", "Bearer "+token)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		handlerCalled := false
		nextHandler := func(c echo.Context) error {
			handlerCalled = true
			return nil
		}

		err = middleware.RequireAuth(nextHandler)(c)

		assert.NoError(t, err)
		assert.False(t, handlerCalled)
		assert.Equal(t, http.StatusUnauthorized, rec.Code)
		assert.Equal(t, "invalid_token", rec.Header().Get("X-Auth-Debug"))
	})

	t.Run("handler returns error", func(t *testing.T) {
		e := echo.New()

		token, err := jwtService.GenerateToken(userID, tenantID, email, role)
		require.NoError(t, err)

		req := httptest.NewRequest(http.MethodGet, "/protected", nil)
		req.Header.Set("Authorization", "Bearer "+token)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		expectedError := echo.NewHTTPError(http.StatusInternalServerError, "handler error")
		nextHandler := func(c echo.Context) error {
			return expectedError
		}

		err = middleware.RequireAuth(nextHandler)(c)

		assert.Equal(t, expectedError, err)
	})
}

func TestMiddleware_RequireRole(t *testing.T) {
	authService := &AuthService{}
	middleware := NewMiddleware(authService)

	t.Run("user with required role", func(t *testing.T) {
		e := echo.New()

		req := httptest.NewRequest(http.MethodGet, "/admin", nil)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		// Set context with admin role
		ctx := c.Request().Context()
		ctx = context.WithValue(ctx, ctxRoleKey, "admin")
		c.SetRequest(c.Request().WithContext(ctx))

		handlerCalled := false
		nextHandler := func(c echo.Context) error {
			handlerCalled = true
			return c.JSON(http.StatusOK, map[string]string{"status": "success"})
		}

		roleHandler := middleware.RequireRole("admin")(nextHandler)
		err := roleHandler(c)

		require.NoError(t, err)
		assert.True(t, handlerCalled)
		assert.Equal(t, http.StatusOK, rec.Code)
	})

	t.Run("user with one of multiple required roles", func(t *testing.T) {
		e := echo.New()

		req := httptest.NewRequest(http.MethodGet, "/manager-admin", nil)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		// Set context with manager role
		ctx := c.Request().Context()
		ctx = context.WithValue(ctx, ctxRoleKey, "manager")
		c.SetRequest(c.Request().WithContext(ctx))

		handlerCalled := false
		nextHandler := func(c echo.Context) error {
			handlerCalled = true
			return c.JSON(http.StatusOK, map[string]string{"status": "success"})
		}

		roleHandler := middleware.RequireRole("admin", "manager")(nextHandler)
		err := roleHandler(c)

		require.NoError(t, err)
		assert.True(t, handlerCalled)
		assert.Equal(t, http.StatusOK, rec.Code)
	})

	t.Run("user without required role", func(t *testing.T) {
		e := echo.New()

		req := httptest.NewRequest(http.MethodGet, "/admin", nil)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		// Set context with staff role (not admin)
		ctx := c.Request().Context()
		ctx = context.WithValue(ctx, ctxRoleKey, "staff")
		c.SetRequest(c.Request().WithContext(ctx))

		handlerCalled := false
		nextHandler := func(c echo.Context) error {
			handlerCalled = true
			return nil
		}

		roleHandler := middleware.RequireRole("admin")(nextHandler)
		err := roleHandler(c)

		assert.NoError(t, err)
		assert.False(t, handlerCalled)
		assert.Equal(t, http.StatusForbidden, rec.Code)

		expectedResponse := `{"success":false,"error":{"code":403,"message":"insufficient permissions"}}`
		assert.JSONEq(t, expectedResponse, rec.Body.String())
	})

	t.Run("missing role in context", func(t *testing.T) {
		e := echo.New()

		req := httptest.NewRequest(http.MethodGet, "/admin", nil)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		// No role set in context

		handlerCalled := false
		nextHandler := func(c echo.Context) error {
			handlerCalled = true
			return nil
		}

		roleHandler := middleware.RequireRole("admin")(nextHandler)
		err := roleHandler(c)

		assert.NoError(t, err)
		assert.False(t, handlerCalled)
		assert.Equal(t, http.StatusForbidden, rec.Code)
	})

	t.Run("empty role string", func(t *testing.T) {
		e := echo.New()

		req := httptest.NewRequest(http.MethodGet, "/admin", nil)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		// Set context with empty role
		ctx := c.Request().Context()
		ctx = context.WithValue(ctx, ctxRoleKey, "")
		c.SetRequest(c.Request().WithContext(ctx))

		handlerCalled := false
		nextHandler := func(c echo.Context) error {
			handlerCalled = true
			return nil
		}

		roleHandler := middleware.RequireRole("admin")(nextHandler)
		err := roleHandler(c)

		assert.NoError(t, err)
		assert.False(t, handlerCalled)
		assert.Equal(t, http.StatusForbidden, rec.Code)
	})

	t.Run("no required roles specified", func(t *testing.T) {
		e := echo.New()

		req := httptest.NewRequest(http.MethodGet, "/open", nil)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		handlerCalled := false
		nextHandler := func(c echo.Context) error {
			handlerCalled = true
			return c.JSON(http.StatusOK, map[string]string{"status": "success"})
		}

		// No roles required - should allow access
		roleHandler := middleware.RequireRole()(nextHandler)
		err := roleHandler(c)

		require.NoError(t, err)
		assert.True(t, handlerCalled)
		assert.Equal(t, http.StatusOK, rec.Code)
	})

	t.Run("case sensitive role matching", func(t *testing.T) {
		e := echo.New()

		req := httptest.NewRequest(http.MethodGet, "/admin", nil)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		// Set context with uppercase role
		ctx := c.Request().Context()
		ctx = context.WithValue(ctx, ctxRoleKey, "ADMIN")
		c.SetRequest(c.Request().WithContext(ctx))

		handlerCalled := false
		nextHandler := func(c echo.Context) error {
			handlerCalled = true
			return nil
		}

		// Required role is lowercase
		roleHandler := middleware.RequireRole("admin")(nextHandler)
		err := roleHandler(c)

		assert.NoError(t, err)
		assert.False(t, handlerCalled)
		assert.Equal(t, http.StatusForbidden, rec.Code)
	})
}

func TestIsPublicPath(t *testing.T) {
	testCases := []struct {
		path     string
		method   string
		expected bool
		desc     string
	}{
		{"/health", "GET", true, "health endpoint"},
		{"/ping", "GET", true, "ping endpoint"},
		{"/api/auth/login", "POST", true, "login endpoint"},
		{"/api/auth/register", "POST", true, "register endpoint"},
		{"/api/auth/refresh", "POST", true, "refresh token endpoint"},
		{"/api/auth/password/forgot", "POST", true, "forgot password endpoint"},
		{"/api/auth/password/reset", "POST", true, "reset password endpoint"},
		{"/api/products", "GET", false, "protected products endpoint"},
		{"/api/users", "GET", false, "protected users endpoint"},
		{"/admin", "GET", false, "admin area"},
		{"/", "GET", false, "root path"},
		{"", "GET", false, "empty path"},
		{"/api/auth/login", "GET", false, "login with wrong method"},
		{"/api/auth/register", "GET", false, "register with wrong method"},
		{"/docs", "GET", true, "documentation path"},
		{"/swagger", "GET", true, "swagger path"},
	}

	for _, tc := range testCases {
		t.Run(tc.desc, func(t *testing.T) {
			result := isPublicPath(tc.path, tc.method)
			assert.Equal(t, tc.expected, result, "path: %s, method: %s", tc.path, tc.method)
		})
	}
}

func TestContextGetters(t *testing.T) {
	ctx := context.Background()

	userID := "test-user-id"
	tenantID := "test-tenant-id"
	role := "admin"
	email := "test@example.com"

	// Set values in context
	ctx = context.WithValue(ctx, ctxUserIDKey, userID)
	ctx = context.WithValue(ctx, ctxTenantIDKey, tenantID)
	ctx = context.WithValue(ctx, ctxRoleKey, role)
	ctx = context.WithValue(ctx, ctxEmailKey, email)

	t.Run("GetUserID", func(t *testing.T) {
		result := GetUserID(ctx)
		assert.Equal(t, userID, result)

		// Test with empty context
		emptyResult := GetUserID(context.Background())
		assert.Empty(t, emptyResult)
	})

	t.Run("GetTenantID", func(t *testing.T) {
		result := GetTenantID(ctx)
		assert.Equal(t, tenantID, result)

		emptyResult := GetTenantID(context.Background())
		assert.Empty(t, emptyResult)
	})

	t.Run("GetRole", func(t *testing.T) {
		result := GetRole(ctx)
		assert.Equal(t, role, result)

		emptyResult := GetRole(context.Background())
		assert.Empty(t, emptyResult)
	})

	t.Run("GetEmail", func(t *testing.T) {
		result := GetEmail(ctx)
		assert.Equal(t, email, result)

		emptyResult := GetEmail(context.Background())
		assert.Empty(t, emptyResult)
	})
}

func TestCanExport(t *testing.T) {
	testCases := []struct {
		role     string
		expected bool
		desc     string
	}{
		{"admin", true, "admin can export"},
		{"manager", true, "manager can export"},
		{"staff", false, "staff cannot export"},
		{"user", false, "user cannot export"},
		{"", false, "empty role cannot export"},
	}

	for _, tc := range testCases {
		t.Run(tc.desc, func(t *testing.T) {
			ctx := context.WithValue(context.Background(), ctxRoleKey, tc.role)
			result := CanExport(ctx)
			assert.Equal(t, tc.expected, result)
		})
	}

	t.Run("missing role in context", func(t *testing.T) {
		result := CanExport(context.Background())
		assert.False(t, result)
	})
}

func TestMiddleware_Integration(t *testing.T) {
	// Full integration test with auth chain
	jwtService := NewJWTService("integration-test-secret")
	authService := &AuthService{jwt: jwtService}
	middleware := NewMiddleware(authService)

	userID := uuid.New().String()
	tenantID := uuid.New().String()
	email := "integration@example.com"

	t.Run("full auth chain - admin access", func(t *testing.T) {
		e := echo.New()

		token, err := jwtService.GenerateToken(userID, tenantID, email, "admin")
		require.NoError(t, err)

		req := httptest.NewRequest(http.MethodDelete, "/admin/users/123", nil)
		req.Header.Set("Authorization", "Bearer "+token)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		handlerCalled := false
		adminHandler := func(c echo.Context) error {
			handlerCalled = true

			// Verify all context values are available
			assert.Equal(t, userID, c.Get("user_id"))
			assert.Equal(t, tenantID, c.Get("tenant_id"))
			assert.Equal(t, "admin", c.Get("user_role"))
			assert.Equal(t, email, c.Get("user_email"))

			// Verify typed context access
			ctx := c.Request().Context()
			assert.Equal(t, userID, GetUserID(ctx))
			assert.Equal(t, "admin", GetRole(ctx))
			assert.True(t, CanExport(ctx))

			return c.JSON(http.StatusOK, map[string]string{"status": "deleted"})
		}

		// Chain RequireAuth -> RequireRole -> Handler
		authChain := middleware.RequireAuth(middleware.RequireRole("admin")(adminHandler))
		err = authChain(c)

		require.NoError(t, err)
		assert.True(t, handlerCalled)
		assert.Equal(t, http.StatusOK, rec.Code)
	})

	t.Run("full auth chain - insufficient role", func(t *testing.T) {
		e := echo.New()

		token, err := jwtService.GenerateToken(userID, tenantID, email, "staff")
		require.NoError(t, err)

		req := httptest.NewRequest(http.MethodDelete, "/admin/users/123", nil)
		req.Header.Set("Authorization", "Bearer "+token)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		handlerCalled := false
		adminHandler := func(c echo.Context) error {
			handlerCalled = true
			return nil
		}

		// Chain RequireAuth -> RequireRole -> Handler
		authChain := middleware.RequireAuth(middleware.RequireRole("admin")(adminHandler))
		err = authChain(c)

		assert.NoError(t, err)
		assert.False(t, handlerCalled)
		assert.Equal(t, http.StatusForbidden, rec.Code)
	})

	t.Run("full auth chain - invalid token", func(t *testing.T) {
		e := echo.New()

		req := httptest.NewRequest(http.MethodDelete, "/admin/users/123", nil)
		req.Header.Set("Authorization", "Bearer invalid.token.here")
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		handlerCalled := false
		adminHandler := func(c echo.Context) error {
			handlerCalled = true
			return nil
		}

		// Chain RequireAuth -> RequireRole -> Handler
		authChain := middleware.RequireAuth(middleware.RequireRole("admin")(adminHandler))
		err = authChain(c)

		assert.NoError(t, err)
		assert.False(t, handlerCalled)
		assert.Equal(t, http.StatusUnauthorized, rec.Code)
		assert.Equal(t, "invalid_token", rec.Header().Get("X-Auth-Debug"))
	})
}

func TestMiddleware_ConcurrentRequests(t *testing.T) {
	jwtService := NewJWTService("concurrent-test-secret")
	authService := &AuthService{jwt: jwtService}
	middleware := NewMiddleware(authService)

	const numRequests = 100
	results := make(chan bool, numRequests)

	for i := 0; i < numRequests; i++ {
		go func(requestID int) {
			e := echo.New()

			userID := uuid.New().String()
			tenantID := uuid.New().String()
			email := "concurrent@example.com"
			role := "admin"

			token, err := jwtService.GenerateToken(userID, tenantID, email, role)
			if err != nil {
				results <- false
				return
			}

			req := httptest.NewRequest(http.MethodGet, "/protected", nil)
			req.Header.Set("Authorization", "Bearer "+token)
			rec := httptest.NewRecorder()
			c := e.NewContext(req, rec)

			handlerCalled := false
			nextHandler := func(c echo.Context) error {
				handlerCalled = true
				return c.JSON(http.StatusOK, map[string]interface{}{
					"request_id": requestID,
					"user_id":    c.Get("user_id"),
				})
			}

			err = middleware.RequireAuth(nextHandler)(c)
			results <- (err == nil && handlerCalled && rec.Code == http.StatusOK)
		}(i)
	}

	// Wait for all requests to complete
	successCount := 0
	for i := 0; i < numRequests; i++ {
		if <-results {
			successCount++
		}
	}

	assert.Equal(t, numRequests, successCount, "All concurrent requests should succeed")
}

func BenchmarkMiddleware_RequireAuth(b *testing.B) {
	jwtService := NewJWTService("benchmark-secret")
	authService := &AuthService{jwt: jwtService}
	middleware := NewMiddleware(authService)

	token, err := jwtService.GenerateToken(
		uuid.New().String(),
		uuid.New().String(),
		"benchmark@example.com",
		"admin",
	)
	if err != nil {
		b.Fatal(err)
	}

	e := echo.New()
	nextHandler := func(c echo.Context) error {
		return c.NoContent(http.StatusOK)
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		req := httptest.NewRequest(http.MethodGet, "/protected", nil)
		req.Header.Set("Authorization", "Bearer "+token)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		err := middleware.RequireAuth(nextHandler)(c)
		if err != nil {
			b.Fatal(err)
		}
	}
}

func BenchmarkMiddleware_RequireRole(b *testing.B) {
	authService := &AuthService{}
	middleware := NewMiddleware(authService)

	e := echo.New()
	nextHandler := func(c echo.Context) error {
		return c.NoContent(http.StatusOK)
	}

	roleHandler := middleware.RequireRole("admin")(nextHandler)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		req := httptest.NewRequest(http.MethodGet, "/admin", nil)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		// Set role in context
		ctx := c.Request().Context()
		ctx = context.WithValue(ctx, ctxRoleKey, "admin")
		c.SetRequest(c.Request().WithContext(ctx))

		err := roleHandler(c)
		if err != nil {
			b.Fatal(err)
		}
	}
}
