package auth

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/labstack/echo/v4"
)

func TestRequireAuthSetsContextAndAllowsNext(t *testing.T) {
	e := echo.New()

	// Use real JWT to exercise normal path
	j := NewJWTService("test-secret")
	as := NewAuthService(nil, nil, j)
	m := NewMiddleware(as)

	token, err := j.GenerateToken("11111111-1111-1111-1111-111111111111", "22222222-2222-2222-2222-222222222222", "user@example.com", "manager")
	if err != nil {
		t.Fatalf("failed to gen token: %v", err)
	}

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	// next handler verifies context
	next := func(c echo.Context) error {
		if got := c.Get("user_role"); got == nil || got.(string) != "manager" {
			t.Fatalf("expected user_role=manager, got=%v", got)
		}
		// typed ctx via getters
		if GetRole(c.Request().Context()) != "manager" {
			t.Fatalf("expected ctx role manager")
		}
		if GetUserID(c.Request().Context()) == "" || GetTenantID(c.Request().Context()) == "" {
			t.Fatalf("expected user_id and tenant_id set in context")
		}
		return c.NoContent(http.StatusOK)
	}

	if err := m.RequireAuth(next)(c); err != nil {
		t.Fatalf("RequireAuth returned error: %v", err)
	}
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
}

func TestRequireRoleUsesContextRBAC(t *testing.T) {
	e := echo.New()
	j := NewJWTService("s")
	token, _ := j.GenerateToken("u", "t", "e@example.com", "admin")

	as := NewAuthService(nil, nil, j)
	m := NewMiddleware(as)

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	called := false
	handler := func(c echo.Context) error {
		called = true
		return c.NoContent(http.StatusOK)
	}

	// Chain RequireAuth then RequireRole
	err := m.RequireAuth(m.RequireRole("admin")(handler))(c)
	if err != nil {
		t.Fatalf("handler err: %v", err)
	}
	if !called {
		t.Fatalf("expected handler to be called for admin")
	}
}

func TestRequireRoleForbidden(t *testing.T) {
	e := echo.New()
	j := NewJWTService("s")
	token, _ := j.GenerateToken("u", "t", "e@example.com", "staff")

	as := NewAuthService(nil, nil, j)
	m := NewMiddleware(as)

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	err := m.RequireAuth(m.RequireRole("admin", "manager")(func(c echo.Context) error {
		return c.NoContent(http.StatusOK)
	}))(c)
	if err != nil {
		t.Fatalf("handler err: %v", err)
	}
	if rec.Code != http.StatusForbidden {
		t.Fatalf("expected 403 for staff, got %d", rec.Code)
	}
}

func TestCanExport(t *testing.T) {
	e := echo.New()
	j := NewJWTService("s")

	for role, allow := range map[string]bool{
		"admin":   true,
		"manager": true,
		"staff":   false,
		"":        false,
	} {
		token, _ := j.GenerateToken("u", "t", "e@example.com", role)
		as := NewAuthService(nil, nil, j)
		m := NewMiddleware(as)

		req := httptest.NewRequest(http.MethodGet, "/", nil)
		req.Header.Set("Authorization", "Bearer "+token)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		_ = m.RequireAuth(func(c echo.Context) error {
			allowed := CanExport(c.Request().Context())
			if allowed != allow {
				t.Fatalf("role=%s expected CanExport=%v got=%v", role, allow, allowed)
			}
			return c.NoContent(http.StatusOK)
		})(c)
	}
}