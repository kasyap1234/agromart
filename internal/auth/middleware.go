package auth

import (
	"agromart/db"
	"agromart/pkg/errors"
	"agromart/pkg/httpx"

	"github.com/google/uuid"
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
		uid, err := uuid.Parse(claims.UserID)
		if err != nil {
			return httpx.Unauthorized(c, errors.ErrUnauthorized.Error())
		}
		queries :=db.Queries{}
		user,err := queries.GetUserByID(c,uid)
		if err !=nil{
			return httpx.Unauthorized(c errors.ErrUnauthorized.Error())

		}


		c.Set("user_id", claims.UserID)
		c.Set("tenant_id", claims.TenantID)
		c.Set("user_role",user.Role)
		return next(c)
	}
}
