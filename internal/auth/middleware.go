package auth

import (
	"strings"

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
		authHeader := c.Request().Header.Get("Authorization")
		if authHeader == "" {
			return echo.NewHTTPError(401, "missing authorization header")
		}

		if !strings.HasPrefix(authHeader, "Bearer ") {
			return echo.NewHTTPError(401, "invalid authorization header format")
		}

		tokenStr := authHeader[len("Bearer "):]
		claims, err := m.authService.ValidateToken(tokenStr)
		if err != nil {
			return echo.NewHTTPError(401, "invalid token")
		}

		// Set user context
		c.Set("user_id", claims.UserID)
		c.Set("tenant_id", claims.TenantID)
		c.Set("user_role", claims.Role)
		c.Set("user_email", claims.Email)

		return next(c)
	}
}

func (m *Middleware) RequireRole(roles ...string) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			userRole := c.Get("user_role")
			if userRole == nil {
				return echo.NewHTTPError(401, "unauthorized")
			}

			role := userRole.(string)
			for _, allowedRole := range roles {
				if role == allowedRole {
					return next(c)
				}
			}

			return echo.NewHTTPError(403, "insufficient permissions")
		}
	}
}
