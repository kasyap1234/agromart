package auth

import (
	"strings"
	"time"

	"github.com/labstack/echo/v4"
)

type Middleware struct {
	authService *AuthService
}

func NewMiddleware(authService *AuthService) *Middleware {
	return &Middleware{
		authService: authService,
	}
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

		// Set user context
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
			userRole := c.Get("user_role")
			if userRole == nil {
				_ = c.JSON(401, map[string]interface{}{
					"success": false,
					"error": map[string]interface{}{
						"code":    401,
						"message": "unauthorized",
					},
				})
				return nil
			}

			role := userRole.(string)
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
