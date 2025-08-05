//go:build integration

package integration

import (
"encoding/json"
"io"
"net/http"
"strings"
"testing"

"github.com/stretchr/testify/require"
)

const baseURL = "http://localhost:8080"

type loginResp struct {
Token string `json:"token"`
}

func getToken(t *testing.T) string {
body := `{"email":"admin@example.com","password":"password"}`
req, err := http.NewRequest(http.MethodPost, baseURL+"/api/auth/login", strings.NewReader(body))
require.NoError(t, err)
req.Header.Set("Content-Type", "application/json")
res, err := http.DefaultClient.Do(req)
require.NoError(t, err)
defer res.Body.Close()
all, _ := io.ReadAll(res.Body)
require.Equalf(t, 200, res.StatusCode, "login failed: %s", string(all))
var lr loginResp
_ = json.Unmarshal(all, &lr)
require.NotEmpty(t, lr.Token)
return lr.Token
}

func authReq(t *testing.T, method, path, token, body string) *http.Response {
req, err := http.NewRequest(method, baseURL+path, strings.NewReader(body))
require.NoError(t, err)
if body != "" {
req.Header.Set("Content-Type", "application/json")
}
req.Header.Set("Authorization", "Bearer "+token)
res, err := http.DefaultClient.Do(req)
require.NoError(t, err)
return res
}

func TestProductsCRUD_FullFlow(t *testing.T) {
token := getToken(t)

// Create
create := `{"sku":"SKU-IT-1","name":"Item 1","price":100,"unit_id":"11111111-1111-1111-1111-111111111111"}`
res := authReq(t, http.MethodPost, "/api/products", token, create)
defer res.Body.Close()
all, _ := io.ReadAll(res.Body)
require.Equalf(t, 201, res.StatusCode, "create product: %s", string(all))

// List
res = authReq(t, http.MethodGet, "/api/products", token, "")
defer res.Body.Close()
require.Equal(t, 200, res.StatusCode)

// Search
res = authReq(t, http.MethodGet, "/api/products/search?q=SKU-IT-1", token, "")
defer res.Body.Close()
require.Equal(t, 200, res.StatusCode)
}

func TestCustomersCRUD_FullFlow(t *testing.T) {
token := getToken(t)

// Create
create := `{"name":"Customer One","email":"c1@example.com","phone":"123"}`
res := authReq(t, http.MethodPost, "/api/customers", token, create)
defer res.Body.Close()
all, _ := io.ReadAll(res.Body)
require.Equalf(t, 201, res.StatusCode, "create customer: %s", string(all))

// List
res = authReq(t, http.MethodGet, "/api/customers", token, "")
defer res.Body.Close()
require.Equal(t, 200, res.StatusCode)

// Search
res = authReq(t, http.MethodGet, "/api/customers/search?q=Customer", token, "")
defer res.Body.Close()
require.Equal(t, 200, res.StatusCode)
}
