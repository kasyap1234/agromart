//go:build integration

package integration

import (
	"io"
	"net/http"
	"strings"
	"testing"

	"github.com/stretchr/testify/require"
)

func loginToken(t *testing.T) string {
	req, _ := http.NewRequest(http.MethodPost, baseURL+"/api/auth/login", strings.NewReader(`{"email":"admin@example.com","password":"AdminPassword123!"}`))
	req.Header.Set("Content-Type", "application/json")
	res, err := http.DefaultClient.Do(req)
	require.NoError(t, err)
	defer res.Body.Close()
	all, _ := io.ReadAll(res.Body)
	require.Equalf(t, 200, res.StatusCode, "login failed: %s", string(all))
	// Extract just the token value
	s := string(all)
	tokenStart := strings.Index(s, `"token":"`)
	require.NotEqual(t, -1, tokenStart)
	tokenStart += len(`"token":"`)
	tokenEnd := strings.Index(s[tokenStart:], `"`)
	require.NotEqual(t, -1, tokenEnd)
	return s[tokenStart : tokenStart+tokenEnd]
}

func TestSuppliers_List_Reachable(t *testing.T) {
	token := loginToken(t)
	req, _ := http.NewRequest(http.MethodGet, baseURL+"/api/suppliers", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	res, err := http.DefaultClient.Do(req)
	require.NoError(t, err)
	defer res.Body.Close()
	require.NotEqual(t, 404, res.StatusCode)
}
