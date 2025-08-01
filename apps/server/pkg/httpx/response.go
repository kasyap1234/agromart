package httpx

import (
	"net/http"

	"github.com/labstack/echo/v4"
)

func OK(c echo.Context, data any) error {

	return c.JSON(http.StatusOK, data)
}

func Created(c echo.Context, data any) error {
	return c.JSON(http.StatusCreated, data)
}

func BadRequest(c echo.Context, msg string) error {
	return c.JSON(http.StatusBadRequest, msg)
}

func Unauthorized(c echo.Context, msg string) error {
	return c.JSON(http.StatusUnauthorized, msg)
}

func Forbidden(c echo.Context, msg string) error {
	return c.JSON(http.StatusForbidden, msg)
}

func NotFound(c echo.Context, msg string) error {
	return c.JSON(http.StatusNotFound, msg)
}

func InternalServerError(c echo.Context, msg string) error {
	return c.JSON(http.StatusInternalServerError, msg)
}

func NoContent(c echo.Context, msg string) error {
	return c.JSON(http.StatusNoContent, msg)
}
