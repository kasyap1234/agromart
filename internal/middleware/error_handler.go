package middleware

import (
	"errors"
	"net/http"

	appErr "agromart2/internal/errors"
	"agromart2/internal/validation"

	"github.com/labstack/echo/v4"
	"github.com/rs/zerolog/log"
)

// Ensure we do NOT register this package as a middleware in Echo chain.
// Instead, set e.HTTPErrorHandler = middleware.HTTPErrorHandler in main.go.

// HTTPErrorHandler is a proper Echo HTTP error handler that preserves status codes
// and returns a consistent JSON error payload.
func HTTPErrorHandler(err error, c echo.Context) {
	// Log once with full context
	log.Error().Err(err).Msg("Request failed")

	// If response already committed, do not attempt to write again
	if c.Response().Committed {
		return
	}
	// If this error is already an echo.HTTPError (or wraps one), prefer to short-circuit early
	// so Echo doesn't transform it later. We'll still preserve status and message below.

	// If response already committed, do not attempt to write again
	if c.Response().Committed {
		return
	}

	// mark that our custom handler processed the error
	c.Response().Header().Set("X-Error-Handler", "custom")

	// 1) Our CustomError
	var ce *appErr.CustomError
	if errors.As(err, &ce) && ce != nil {
		_ = c.JSON(ce.Code, map[string]interface{}{
			"success": false,
			"handler": "custom",
			"error": map[string]interface{}{
				"code":    ce.Code,
				"message": ce.Message,
			},
		})
		return
	}

	// 2) Validation errors
	var ve validation.ValidationErrors
	if errors.As(err, &ve) {
		_ = c.JSON(http.StatusBadRequest, map[string]interface{}{
			"success": false,
			"handler": "custom",
			"error": map[string]interface{}{
				"code":    http.StatusBadRequest,
				"message": "Validation failed",
				"details": ve.Error(),
			},
		})
		return
	}

	// 3) Echo HTTPError (preserve status and message), even if wrapped
	var he *echo.HTTPError
	if errors.As(err, &he) && he != nil {
		code := he.Code
		msg := he.Message
		if msg == nil {
			msg = http.StatusText(code)
		}
		// Avoid double write: if Body has been started, just set status code
		if c.Response().Committed {
			c.Response().Status = code
			return
		}
		_ = c.JSON(code, map[string]interface{}{
			"success": false,
			"handler": "custom",
			"error": map[string]interface{}{
				"code":    code,
				"message": msg,
			},
		})
		return
	}
	// 3b) Our lightweight HTTPError wrapper (defined below)
	var lhe *HTTPError
	if errors.As(err, &lhe) && lhe != nil {
		code := lhe.Code
		if code <= 0 {
			code = http.StatusBadRequest
		}
		_ = c.JSON(code, map[string]interface{}{
			"success": false,
			"handler": "custom",
			"error": map[string]interface{}{
				"code":    code,
				"message": lhe.Error(),
			},
		})
		return
	}

	// 4) Fallback: 500
	_ = c.JSON(http.StatusInternalServerError, map[string]interface{}{
		"success": false,
		"handler": "custom",
		"error": map[string]interface{}{
			"code":    http.StatusInternalServerError,
			"message": "Internal server error",
			"details": "An unexpected error occurred",
		},
	})
}

// HTTPError is a small wrapper to explicitly carry an HTTP status with a message.
// Use this when you want to stop the error handler from converting known client
// errors into 500. Prefer returning JSON directly in handlers when possible.
type HTTPError struct {
	Code    int
	Message string
}

func (e *HTTPError) Error() string {
	if e.Message != "" {
		return e.Message
	}
	return http.StatusText(e.Code)
}

// RecoverMiddleware recovers from panics and returns a 500 error
func RecoverMiddleware(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		defer func() {
			if r := recover(); r != nil {
				log.Error().Interface("panic", r).Msg("Recovered from panic")
				_ = c.JSON(http.StatusInternalServerError, map[string]interface{}{
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