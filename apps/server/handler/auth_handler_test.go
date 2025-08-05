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
	_ = h.Login(c)
	require.Equal(t, http.StatusBadRequest, rec.Code)
	// And body should not be empty
	require.NotEmpty(t, rec.Body.String())
}

// Constructor smoke test to ensure handler can be instantiated without env/service.
func TestAuth_Handler_Construct(t *testing.T) {
	h := NewAuthHandler(nil)
	require.NotNil(t, h)
}
