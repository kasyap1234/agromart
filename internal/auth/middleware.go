package auth

import (
	"context"
	"strings"
	"time"

	"github.com/labstack/echo/v4"
)

// typed context keys to avoid collisions
type ctxKey string

const (
	ctxUserIDKey   ctxKey = "user_id"
	ctxTenantIDKey ctxKey = "tenant_id"
	ctxRoleKey     ctxKey = "role"
	ctxEmailKey    ctxKey = "email"
)

type Middleware struct {
	authService *AuthService
}

func NewMiddleware(authService *AuthService) *Middleware {
	return &Middleware{
		authService: authService,
	}
}

// Helper getters for downstream services/handlers
func GetUserID(ctx context.Context) string {
	if v := ctx.Value(ctxUserIDKey); v != nil {
		if s, ok := v.(string); ok {
			return s
		}
	}
	return ""
}

func GetTenantID(ctx context.Context) string {
	if v := ctx.Value(ctxTenantIDKey); v != nil {
		if s, ok := v.(string); ok {
			return s
		}
	}
	return ""
}

func GetRole(ctx context.Context) string {
	if v := ctx.Value(ctxRoleKey); v != nil {
		if s, ok := v.(string); ok {
			return s
		}
	}
	return ""
}

func GetEmail(ctx context.Context) string {
	if v := ctx.Value(ctxEmailKey); v != nil {
		if s, ok := v.(string); ok {
			return s
		}
	}
	return ""
}

func (m *Middleware) RequireAuth(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		start := time.Now()
		authHeader := c.Request().Header.Get("Authorization")
		if authHeader == "" {
			c.Response().Header().Set("X-Auth-Debug", "missing_header")
			_ = c.JSON(401, map[string]interface{}{
				"success": false,
				"error": map[string]interface{}{
					"code":    401,
					"message": "missing authorization header",
				},
			})
			return nil
		}

		if !strings.HasPrefix(authHeader, "Bearer ") {
			c.Response().Header().Set("X-Auth-Debug", "bad_format")
			_ = c.JSON(401, map[string]interface{}{
				"success": false,
				"error": map[string]interface{}{
					"code":    401,
					"message": "invalid authorization header format",
				},
			})
			return nil
		}

		tokenStr := authHeader[len("Bearer "):]
		claims, err := m.authService.ValidateToken(tokenStr)
		if err != nil {
			c.Response().Header().Set("X-Auth-Debug", "invalid_token")
			_ = c.JSON(401, map[string]interface{}{
				"success": false,
				"error": map[string]interface{}{
					"code":    401,
					"message": "invalid token",
				},
			})
			return nil
		}

		// Enrich context with typed keys for RBAC and downstream services
		ctx := c.Request().Context()
		ctx = context.WithValue(ctx, ctxUserIDKey, claims.UserID)
		ctx = context.WithValue(ctx, ctxTenantIDKey, claims.TenantID)
		ctx = context.WithValue(ctx, ctxRoleKey, claims.Role)
		ctx = context.WithValue(ctx, ctxEmailKey, claims.Email)
		c.SetRequest(c.Request().WithContext(ctx))

		// Maintain echo context keys for backward compatibility
		c.Set("user_id", claims.UserID)
		c.Set("tenant_id", claims.TenantID)
		c.Set("user_role", claims.Role)
		c.Set("user_email", claims.Email)

		// lightweight diagnostic timing header
		c.Response().Header().Set("X-Auth-Time", time.Since(start).String())

		return next(c)
	}
}

func (m *Middleware) RequireRole(roles ...string) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			// Prefer context-based role
			role := GetRole(c.Request().Context())
			if role == "" {
				// Fallback to echo context key
				if v := c.Get("user_role"); v != nil {
					if s, ok := v.(string); ok {
						role = s
					}
				}
			}

			if role == "" {
				_ = c.JSON(401, map[string]interface{}{
					"success": false,
					"error": map[string]interface{}{
						"code":    401,
						"message": "unauthorized",
					},
				})
				return nil
			}

			for _, allowedRole := range roles {
				if role == allowedRole {
					return next(c)
				}
			}

			_ = c.JSON(403, map[string]interface{}{
				"success": false,
				"error": map[string]interface{}{
					"code":    403,
					"message": "insufficient permissions",
				},
			})
			return nil
		}
	}
}

// CanExport implements exportRBAC check based on role from context.
// By default, allow admin and manager to export.
func CanExport(ctx context.Context) bool {
	role := GetRole(ctx)
	switch role {
	case "admin", "manager":
		return true
	default:
		return false
	}
}
