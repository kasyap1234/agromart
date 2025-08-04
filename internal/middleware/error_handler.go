package middleware

import (
	"net/http"

	"agromart2/internal/errors"
	"agromart2/internal/validation"

	"github.com/labstack/echo/v4"
	"github.com/rs/zerolog/log"
)

// ErrorHandler handles errors and returns appropriate HTTP responses
func ErrorHandler(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		// Call the next handler
		err := next(c)
		
		if err == nil {
			return nil
		}

		// Log the error
		log.Error().Err(err).Msg("Request failed")

		// Handle different types of errors
		switch e := err.(type) {
		case *errors.AppError:
			return c.JSON(e.Code, map[string]interface{}{
				"success": false,
				"error": map[string]interface{}{
					"code":    e.Code,
					"message": e.Message,
					"details": e.Details,
				},
			})
		case validation.ValidationErrors:
			return c.JSON(http.StatusBadRequest, map[string]interface{}{
				"success": false,
				"error": map[string]interface{}{
					"code":    http.StatusBadRequest,
					"message": "Validation failed",
					"details": e.Error(),
				},
			})
		default:
			// For unknown errors, return a generic 500 error
			return c.JSON(http.StatusInternalServerError, map[string]interface{}{
				"success": false,
				"error": map[string]interface{}{
					"code":    http.StatusInternalServerError,
					"message": "Internal server error",
					"details": "An unexpected error occurred",
				},
			})
		}
	}
}

// RecoverMiddleware recovers from panics and returns a 500 error
func RecoverMiddleware(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		defer func() {
			if r := recover(); r != nil {
				log.Error().Interface("panic", r).Msg("Recovered from panic")
				c.JSON(http.StatusInternalServerError, map[string]interface{}{
					"success": false,
					"error": map[string]interface{}{
						"code":    http.StatusInternalServerError,
						"message": "Internal server error",
						"details": "An unexpected error occurred",
					},
				})
			}
		}()
		return next(c)
	}
}

// RequestIDMiddleware adds a request ID to the context
func RequestIDMiddleware(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		requestID := c.Request().Header.Get("X-Request-ID")
		if requestID == "" {
			requestID = generateRequestID()
		}
		
		c.Set("request_id", requestID)
		c.Response().Header().Set("X-Request-ID", requestID)
		
		return next(c)
	}
}

// generateRequestID generates a simple request ID
func generateRequestID() string {
	// In a real application, you might want to use a more robust method
	return "req_" + randomString(8)
}

// randomString generates a random string of given length
func randomString(length int) string {
	const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	b := make([]byte, length)
	for i := range b {
		b[i] = charset[i%len(charset)]
	}
	return string(b)
}