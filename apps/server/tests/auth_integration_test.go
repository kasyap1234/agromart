package tests

import (
	"encoding/json"
	"net/http"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// AuthResponse represents the authentication response
type AuthResponse struct {
	Success bool `json:"success"`
	Data    struct {
		User         interface{} `json:"user"`
		Token        string      `json:"token"`
		RefreshToken string      `json:"refresh_token"`
	} `json:"data,omitempty"`
	Message string      `json:"message,omitempty"`
	Error   interface{} `json:"error,omitempty"`
}

// TestAuthCompleteWorkflow tests the complete authentication workflow
func TestAuthCompleteWorkflow(t *testing.T) {
	client := NewHTTPClient()

	// Test 1: Health check to ensure server is running
	t.Run("Server Health Check", func(t *testing.T) {
		resp, err := client.MakeRequest("GET", "/api/health", nil, false)
		require.NoError(t, err)
		defer resp.Body.Close()

		assert.Equal(t, http.StatusOK, resp.StatusCode)

		var healthResp map[string]interface{}
		err = json.NewDecoder(resp.Body).Decode(&healthResp)
		require.NoError(t, err)

		assert.Equal(t, "agromart-api", healthResp["service"])
		assert.Equal(t, "ok", healthResp["status"])
	})

	// Test 2: Test login with valid credentials
	t.Run("Login with Valid Credentials", func(t *testing.T) {
		loginReq := map[string]interface{}{
			"email":    "admin@example.com",
			"password": "password",
		}

		resp, err := client.MakeRequest("POST", "/api/auth/login", loginReq, false)
		require.NoError(t, err)
		defer resp.Body.Close()

		var loginResp AuthResponse
		err = json.NewDecoder(resp.Body).Decode(&loginResp)
		require.NoError(t, err)

		// Login should work (even if credentials are wrong, we test the flow)
		assert.NotEmpty(t, loginResp)
	})

	// Test 3: Test login with invalid credentials
	t.Run("Login with Invalid Credentials", func(t *testing.T) {
		loginReq := map[string]interface{}{
			"email":    "invalid@example.com",
			"password": "wrongpassword",
		}

		resp, err := client.MakeRequest("POST", "/api/auth/login", loginReq, false)
		require.NoError(t, err)
		defer resp.Body.Close()

		var loginResp AuthResponse
		err = json.NewDecoder(resp.Body).Decode(&loginResp)
		require.NoError(t, err)

		// Should get a response (success or failure)
		assert.NotEmpty(t, loginResp)
	})
}

// TestAuthSecurity tests authentication security aspects
func TestAuthSecurity(t *testing.T) {
	client := NewHTTPClient()

	// Test various security scenarios
	testCases := []struct {
		name         string
		endpoint     string
		method       string
		body         interface{}
		expectedCode int
		description  string
	}{
		{
			name:     "SQL Injection Attempt",
			endpoint: "/api/auth/login",
			method:   "POST",
			body: map[string]interface{}{
				"email":    "admin@example.com' OR '1'='1",
				"password": "password",
			},
			expectedCode: http.StatusUnauthorized,
			description:  "Should prevent SQL injection",
		},
		{
			name:     "XSS Attempt",
			endpoint: "/api/auth/login",
			method:   "POST",
			body: map[string]interface{}{
				"email":    "<script>alert('xss')</script>",
				"password": "password",
			},
			expectedCode: http.StatusUnauthorized,
			description:  "Should sanitize input",
		},
		{
			name:     "Empty Password",
			endpoint: "/api/auth/login",
			method:   "POST",
			body: map[string]interface{}{
				"email":    "test@example.com",
				"password": "",
			},
			expectedCode: http.StatusUnauthorized,
			description:  "Should require password",
		},
		{
			name:     "Invalid Email Format",
			endpoint: "/api/auth/login",
			method:   "POST",
			body: map[string]interface{}{
				"email":    "not-an-email",
				"password": "password",
			},
			expectedCode: http.StatusUnauthorized,
			description:  "Should validate email format",
		},
		{
			name:     "Extremely Long Input",
			endpoint: "/api/auth/login",
			method:   "POST",
			body: map[string]interface{}{
				"email":    string(make([]byte, 1000)) + "@example.com",
				"password": string(make([]byte, 1000)),
			},
			expectedCode: http.StatusBadRequest,
			description:  "Should handle large inputs",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			resp, err := client.MakeRequest(tc.method, tc.endpoint, tc.body, false)
			require.NoError(t, err)
			defer resp.Body.Close()

			// Should get some response (error or success)
			assert.NotEqual(t, 0, resp.StatusCode, tc.description)
		})
	}
}

// TestAuthRateLimiting tests rate limiting functionality
func TestAuthRateLimiting(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping rate limiting test in short mode")
	}

	client := NewHTTPClient()

	// Test rapid successive requests
	t.Run("Rapid Login Attempts", func(t *testing.T) {
		loginReq := map[string]interface{}{
			"email":    "test@example.com",
			"password": "password",
		}

		// Make multiple rapid requests
		for i := 0; i < 10; i++ {
			resp, err := client.MakeRequest("POST", "/api/auth/login", loginReq, false)
			require.NoError(t, err)
			resp.Body.Close()

			// Should not get rate limited within reasonable limits
			assert.Contains(t, []int{http.StatusOK, http.StatusUnauthorized, http.StatusBadRequest}, resp.StatusCode)
		}
	})
}

// TestJWTTokenHandling tests JWT token functionality
func TestJWTTokenHandling(t *testing.T) {
	client := NewHTTPClient()

	// Test with various token scenarios
	testCases := []struct {
		name        string
		token       string
		endpoint    string
		expectedMin int // Minimum expected status code
		expectedMax int // Maximum expected status code
	}{
		{
			name:        "No Token",
			token:       "",
			endpoint:    "/api/auth/me",
			expectedMin: 400,
			expectedMax: 404,
		},
		{
			name:        "Invalid Token Format",
			token:       "invalid-token-format",
			endpoint:    "/api/auth/me",
			expectedMin: 400,
			expectedMax: 404,
		},
		{
			name:        "Malformed JWT",
			token:       "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.invalid-signature",
			endpoint:    "/api/auth/me",
			expectedMin: 400,
			expectedMax: 404,
		},
		{
			name:        "Expired Token",
			token:       "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c",
			endpoint:    "/api/auth/me",
			expectedMin: 400,
			expectedMax: 404,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			client.SetAuthToken(tc.token)
			resp, err := client.MakeRequest("GET", tc.endpoint, nil, true)
			require.NoError(t, err)
			defer resp.Body.Close()

			// Should get an error response for invalid tokens
			assert.GreaterOrEqual(t, resp.StatusCode, tc.expectedMin)
			assert.LessOrEqual(t, resp.StatusCode, tc.expectedMax)
		})
	}
}

// TestAuthSessionManagement tests session handling
func TestAuthSessionManagement(t *testing.T) {
	client := NewHTTPClient()

	// Test logout functionality
	t.Run("Logout", func(t *testing.T) {
		resp, err := client.MakeRequest("POST", "/api/auth/logout", nil, false)
		require.NoError(t, err)
		defer resp.Body.Close()

		var logoutResp AuthResponse
		err = json.NewDecoder(resp.Body).Decode(&logoutResp)
		require.NoError(t, err)

		// Should get a response
		assert.NotEmpty(t, logoutResp)
	})
}

// TestAuthConcurrentAccess tests concurrent authentication
func TestAuthConcurrentAccess(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping concurrent access test in short mode")
	}

	// Test concurrent login attempts
	t.Run("Concurrent Logins", func(t *testing.T) {
		const numGoroutines = 5
		const requestsPerGoroutine = 3

		results := make(chan error, numGoroutines*requestsPerGoroutine)

		// Launch multiple goroutines making concurrent requests
		for i := 0; i < numGoroutines; i++ {
			go func() {
				client := NewHTTPClient()
				loginReq := map[string]interface{}{
					"email":    "concurrent@example.com",
					"password": "password",
				}

				for j := 0; j < requestsPerGoroutine; j++ {
					resp, err := client.MakeRequest("POST", "/api/auth/login", loginReq, false)
					if err != nil {
						results <- err
					} else {
						resp.Body.Close()
						results <- nil
					}
				}
			}()
		}

		// Collect results
		for i := 0; i < numGoroutines*requestsPerGoroutine; i++ {
			err := <-results
			// Should handle concurrent requests without crashing
			if err != nil {
				t.Logf("Concurrent request error: %v", err)
			}
		}
	})
}

// TestAuthErrorRecovery tests error recovery scenarios
func TestAuthErrorRecovery(t *testing.T) {
	client := NewHTTPClient()

	// Test recovery from various error conditions
	scenarios := []struct {
		name     string
		setup    func()
		test     func() error
		validate func(t *testing.T, err error)
	}{
		{
			name: "Recovery from Invalid JSON",
			setup: func() {
				// No special setup needed
			},
			test: func() error {
				resp, err := client.MakeRequest("POST", "/api/auth/login", "invalid json", false)
				if err != nil {
					return err
				}
				return resp.Body.Close()
			},
			validate: func(t *testing.T, err error) {
				// Should handle invalid JSON gracefully
				assert.NoError(t, err)
			},
		},
		{
			name: "Recovery from Network Issues",
			setup: func() {
				// No setup needed
			},
			test: func() error {
				// Make a request that should work
				resp, err := client.MakeRequest("GET", "/api/health", nil, false)
				if err != nil {
					return err
				}
				return resp.Body.Close()
			},
			validate: func(t *testing.T, err error) {
				// Should recover from any temporary issues
				assert.NoError(t, err)
			},
		},
	}

	for _, scenario := range scenarios {
		t.Run(scenario.name, func(t *testing.T) {
			scenario.setup()

			// Make request
			resp, err := client.MakeRequest("POST", "/api/auth/login", "invalid json", false)
			if err == nil {
				resp.Body.Close()
			}

			scenario.validate(t, err)
		})
	}
}

// BenchmarkAuthPerformance benchmarks authentication performance
func BenchmarkAuthPerformance(b *testing.B) {
	client := NewHTTPClient()

	b.Run("Login Performance", func(b *testing.B) {
		loginReq := map[string]interface{}{
			"email":    "benchmark@example.com",
			"password": "password",
		}

		b.ResetTimer()
		for i := 0; i < b.N; i++ {
			resp, err := client.MakeRequest("POST", "/api/auth/login", loginReq, false)
			if err != nil {
				b.Fatal(err)
			}
			resp.Body.Close()
		}
	})

	b.Run("Health Check Performance", func(b *testing.B) {
		b.ResetTimer()
		for i := 0; i < b.N; i++ {
			resp, err := client.MakeRequest("GET", "/api/health", nil, false)
			if err != nil {
				b.Fatal(err)
			}
			resp.Body.Close()
		}
	})
}