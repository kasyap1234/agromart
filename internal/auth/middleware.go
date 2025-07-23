package auth

import (
	"agromart/pkg/errors"
	"agromart/pkg/httpx"

	"github.com/labstack/echo/v4"
)

func RequireAuth(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		authHeader := c.Request().Header.Get("Authorization")
		if authHeader == "" {
			return httpx.Unauthorized(c, errors.ErrUnauthorized.Error())
		}
		tokenStr := authHeader[len("Bearer "):]
		claims, err := ParseToken(tokenStr)
		if err != nil {
			return httpx.Unauthorized(c, errors.ErrUnauthorized.Error())
		}
		c.Set("user_id", claims.UserID)
		c.Set("tenant_id", claims.TenantID)
		return next(c)
	}
}
