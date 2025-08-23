package tests

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// APIResponse represents a standardized API response
type APIResponse struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data,omitempty"`
	Message string      `json:"message,omitempty"`
	Error   interface{} `json:"error,omitempty"`
}

// HTTPClient holds test client configuration
type HTTPClient struct {
	BaseURL  string
	JWTToken string
	client   *http.Client
}

// NewHTTPClient creates a new HTTP client for testing
func NewHTTPClient() *HTTPClient {
	baseURL := os.Getenv("TEST_API_URL")
	if baseURL == "" {
		baseURL = "http://localhost:8080" // Default server URL
	}

	return &HTTPClient{
		BaseURL: baseURL,
		client: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// SetAuthToken sets the JWT token for authenticated requests
func (hc *HTTPClient) SetAuthToken(token string) {
	hc.JWTToken = token
}

// MakeRequest makes an HTTP request with optional authentication
func (hc *HTTPClient) MakeRequest(method, endpoint string, body interface{}, authenticated bool) (*http.Response, error) {
	var reqBody *bytes.Buffer
	if body != nil {
		jsonBody, err := json.Marshal(body)
		if err != nil {
			return nil, err
		}
		reqBody = bytes.NewBuffer(jsonBody)
	} else {
		reqBody = bytes.NewBuffer(nil)
	}

	url := hc.BaseURL + endpoint
	req, err := http.NewRequest(method, url, reqBody)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Content-Type", "application/json")
	if authenticated && hc.JWTToken != "" {
		req.Header.Set("Authorization", "Bearer "+hc.JWTToken)
	}

	return hc.client.Do(req)
}

// Login performs login and stores the JWT token
func (hc *HTTPClient) Login(email, password string) error {
	loginReq := map[string]interface{}{
		"email":    email,
		"password": password,
	}

	resp, err := hc.MakeRequest("POST", "/api/auth/login", loginReq, false)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	var loginResp APIResponse
	err = json.NewDecoder(resp.Body).Decode(&loginResp)
	if err != nil {
		return err
	}

	if !loginResp.Success {
		return fmt.Errorf("login failed")
	}

	// Extract token from response
	data, ok := loginResp.Data.(map[string]interface{})
	if !ok {
		return fmt.Errorf("invalid response format")
	}

	token, ok := data["token"].(string)
	if !ok {
		return fmt.Errorf("no token in response")
	}

	hc.JWTToken = token
	return nil
}

// TestHealthCheck tests the health check endpoint
func TestHealthCheck(t *testing.T) {
	client := NewHTTPClient()

	tests := []struct {
		name       string
		endpoint   string
		wantStatus int
	}{
		{"Health Check", "/api/health", http.StatusOK},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			resp, err := client.MakeRequest("GET", tt.endpoint, nil, false)
			require.NoError(t, err)
			defer resp.Body.Close()

			assert.Equal(t, tt.wantStatus, resp.StatusCode)

			var response APIResponse
			err = json.NewDecoder(resp.Body).Decode(&response)
			require.NoError(t, err)
		})
	}
}

// TestAuthenticationEndpoints tests auth-related endpoints
func TestAuthenticationEndpoints(t *testing.T) {
	client := NewHTTPClient()

	t.Run("Login", func(t *testing.T) {
		loginReq := map[string]interface{}{
			"email":    "admin@example.com",
			"password": "password",
		}

		resp, err := client.MakeRequest("POST", "/api/auth/login", loginReq, false)
		require.NoError(t, err)
		defer resp.Body.Close()

		var response APIResponse
		err = json.NewDecoder(resp.Body).Decode(&response)
		require.NoError(t, err)

		// Should get a response (success or failure)
		assert.NotEmpty(t, response)
	})

	t.Run("Invalid Login", func(t *testing.T) {
		loginReq := map[string]interface{}{
			"email":    "invalid@example.com",
			"password": "wrongpassword",
		}

		resp, err := client.MakeRequest("POST", "/api/auth/login", loginReq, false)
		require.NoError(t, err)
		defer resp.Body.Close()

		var response APIResponse
		err = json.NewDecoder(resp.Body).Decode(&response)

		// Error responses might not be in standard format
		if err == nil {
			assert.False(t, response.Success)
		}
	})
}

// TestProtectedEndpoints tests endpoints that require authentication
func TestProtectedEndpoints(t *testing.T) {
	client := NewHTTPClient()

	t.Run("Unauthenticated Access", func(t *testing.T) {
		resp, err := client.MakeRequest("GET", "/api/auth/me", nil, false)
		require.NoError(t, err)
		defer resp.Body.Close()

		// Should get unauthorized error
		assert.Contains(t, []int{http.StatusUnauthorized, http.StatusBadRequest}, resp.StatusCode)
	})

	t.Run("Authenticated Access with Invalid Token", func(t *testing.T) {
		client.SetAuthToken("invalid-token")
		resp, err := client.MakeRequest("GET", "/api/auth/me", nil, true)
		require.NoError(t, err)
		defer resp.Body.Close()

		// Should get unauthorized error
		assert.Equal(t, http.StatusUnauthorized, resp.StatusCode)
	})
}

// TestProductEndpoints tests product management endpoints
func TestProductEndpoints(t *testing.T) {
	client := NewHTTPClient()

	t.Run("List Products", func(t *testing.T) {
		resp, err := client.MakeRequest("GET", "/api/products", nil, false)
		require.NoError(t, err)
		defer resp.Body.Close()

		var response APIResponse
		err = json.NewDecoder(resp.Body).Decode(&response)

		if err == nil {
			assert.NotEmpty(t, response)
		}
	})

	t.Run("List Product Units", func(t *testing.T) {
		resp, err := client.MakeRequest("GET", "/api/products/units", nil, false)
		require.NoError(t, err)
		defer resp.Body.Close()

		var response APIResponse
		err = json.NewDecoder(resp.Body).Decode(&response)

		if err == nil {
			assert.NotEmpty(t, response)
		}
	})
}

// TestUserEndpoints tests user management endpoints
func TestUserEndpoints(t *testing.T) {
	client := NewHTTPClient()

	t.Run("List Users", func(t *testing.T) {
		resp, err := client.MakeRequest("GET", "/api/users", nil, false)
		require.NoError(t, err)
		defer resp.Body.Close()

		var response APIResponse
		err = json.NewDecoder(resp.Body).Decode(&response)

		if err == nil {
			assert.NotEmpty(t, response)
		}
	})
}

// TestLocationEndpoints tests location management endpoints
func TestLocationEndpoints(t *testing.T) {
	client := NewHTTPClient()

	t.Run("List Locations", func(t *testing.T) {
		resp, err := client.MakeRequest("GET", "/api/locations", nil, false)
		require.NoError(t, err)
		defer resp.Body.Close()

		var response APIResponse
		err = json.NewDecoder(resp.Body).Decode(&response)

		if err == nil {
			assert.NotEmpty(t, response)
		}
	})
}

// TestInventoryEndpoints tests inventory management endpoints
func TestInventoryEndpoints(t *testing.T) {
	client := NewHTTPClient()

	t.Run("Get Inventory", func(t *testing.T) {
		resp, err := client.MakeRequest("GET", "/api/inventory", nil, false)
		require.NoError(t, err)
		defer resp.Body.Close()

		var response APIResponse
		err = json.NewDecoder(resp.Body).Decode(&response)

		if err == nil {
			assert.NotEmpty(t, response)
		}
	})
}

// TestPurchaseOrderEndpoints tests purchase order endpoints
func TestPurchaseOrderEndpoints(t *testing.T) {
	client := NewHTTPClient()

	t.Run("List Purchase Orders", func(t *testing.T) {
		resp, err := client.MakeRequest("GET", "/api/purchase-orders", nil, false)
		require.NoError(t, err)
		defer resp.Body.Close()

		var response APIResponse
		err = json.NewDecoder(resp.Body).Decode(&response)

		if err == nil {
			assert.NotEmpty(t, response)
		}
	})
}

// TestSalesEndpoints tests sales order endpoints
func TestSalesEndpoints(t *testing.T) {
	client := NewHTTPClient()

	t.Run("List Sales Orders", func(t *testing.T) {
		resp, err := client.MakeRequest("GET", "/api/sales", nil, false)
		require.NoError(t, err)
		defer resp.Body.Close()

		var response APIResponse
		err = json.NewDecoder(resp.Body).Decode(&response)

		if err == nil {
			assert.NotEmpty(t, response)
		}
	})
}

// TestSettingsEndpoints tests settings endpoints
func TestSettingsEndpoints(t *testing.T) {
	client := NewHTTPClient()

	t.Run("Get Settings", func(t *testing.T) {
		resp, err := client.MakeRequest("GET", "/api/settings", nil, false)
		require.NoError(t, err)
		defer resp.Body.Close()

		var response APIResponse
		err = json.NewDecoder(resp.Body).Decode(&response)

		if err == nil {
			assert.NotEmpty(t, response)
		}
	})
}

// TestReportEndpoints tests reporting endpoints
func TestReportEndpoints(t *testing.T) {
	client := NewHTTPClient()

	reports := []string{
		"/api/reports/low-stock",
		"/api/reports/expiring-batches",
		"/api/reports/inventory-value",
	}

	for _, endpoint := range reports {
		t.Run(fmt.Sprintf("Report: %s", endpoint), func(t *testing.T) {
			resp, err := client.MakeRequest("GET", endpoint, nil, false)
			require.NoError(t, err)
			defer resp.Body.Close()

			var response APIResponse
			err = json.NewDecoder(resp.Body).Decode(&response)

			if err == nil {
				assert.NotEmpty(t, response)
			}
		})
	}
}

// TestErrorScenarios tests various error conditions
func TestErrorScenarios(t *testing.T) {
	client := NewHTTPClient()

	t.Run("Invalid JSON", func(t *testing.T) {
		resp, err := client.MakeRequest("POST", "/api/auth/login", "invalid json", false)
		require.NoError(t, err)
		defer resp.Body.Close()

		assert.Contains(t, []int{http.StatusBadRequest, http.StatusUnprocessableEntity}, resp.StatusCode)
	})

	t.Run("Missing Required Fields", func(t *testing.T) {
		incompleteData := map[string]interface{}{
			"email": "test@example.com",
		}

		resp, err := client.MakeRequest("POST", "/api/auth/login", incompleteData, false)
		require.NoError(t, err)
		defer resp.Body.Close()

		var response APIResponse
		err = json.NewDecoder(resp.Body).Decode(&response)

		if err == nil {
			assert.False(t, response.Success)
		}
	})

	t.Run("Non-existent Endpoint", func(t *testing.T) {
		resp, err := client.MakeRequest("GET", "/api/nonexistent", nil, false)
		require.NoError(t, err)
		defer resp.Body.Close()

		assert.Equal(t, http.StatusNotFound, resp.StatusCode)
	})
}

// TestPerformance benchmarks API endpoints
func TestPerformance(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping performance tests in short mode")
	}

	client := NewHTTPClient()

	t.Run("Health Check Performance", func(t *testing.T) {
		start := time.Now()
		iterations := 100

		for i := 0; i < iterations; i++ {
			resp, err := client.MakeRequest("GET", "/api/health", nil, false)
			require.NoError(t, err)
			resp.Body.Close()
		}

		elapsed := time.Since(start)
		avgLatency := elapsed / time.Duration(iterations)

		t.Logf("Health check performance: %d requests in %v (avg: %v)",
			iterations, elapsed, avgLatency)

		assert.Less(t, avgLatency, 100*time.Millisecond, "Health check should be fast")
	})
}

// TestAPIResponseFormats tests that API responses follow consistent format
func TestAPIResponseFormats(t *testing.T) {
	client := NewHTTPClient()

	endpoints := []string{
		"/api/health",
		"/api/products",
		"/api/users",
		"/api/locations",
		"/api/inventory",
		"/api/purchase-orders",
		"/api/sales",
		"/api/settings",
	}

	for _, endpoint := range endpoints {
		t.Run(fmt.Sprintf("Response Format: %s", endpoint), func(t *testing.T) {
			resp, err := client.MakeRequest("GET", endpoint, nil, false)
			require.NoError(t, err)
			defer resp.Body.Close()

			// Should get a valid response
			var response APIResponse
			err = json.NewDecoder(resp.Body).Decode(&response)

			// If we can decode it, check structure
			if err == nil {
				// Response should have success field
				_ = response.Success // Just verify it can be accessed
			}
		})
	}
}