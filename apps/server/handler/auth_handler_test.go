package handler

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/labstack/echo/v4"
	"github.com/stretchr/testify/require"
)

// Adjusted: some handlers may swallow bind errors and write HTTP 400 without returning Go error.
// Assert status code instead of expecting a non-nil error.
func TestAuth_Login_HandlesBadBody(t *testing.T) {
	e := echo.New()
	h := NewAuthHandler(nil)

	req := httptest.NewRequest(http.MethodPost, "/api/auth/login", strings.NewReader("{bad json"))
	req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	// Should return 400 for malformed JSON without panic
	err := h.Login(c)
	
	// Echo returns HTTPError for validation failures
	require.NotNil(t, err)
	httpErr, ok := err.(*echo.HTTPError)
	require.True(t, ok, "Expected HTTPError")
	require.Equal(t, http.StatusBadRequest, httpErr.Code)
	require.Equal(t, "invalid request body", httpErr.Message)
}

// Constructor smoke test to ensure handler can be instantiated without env/service.
func TestAuth_Handler_Construct(t *testing.T) {
	h := NewAuthHandler(nil)
	require.NotNil(t, h)
}
