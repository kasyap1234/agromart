package auth

import (
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNewJWTService(t *testing.T) {
	t.Run("with custom secret", func(t *testing.T) {
		service := NewJWTService("custom-secret")
		assert.NotNil(t, service)
		assert.Equal(t, []byte("custom-secret"), service.secretKey)
	})

	t.Run("with empty secret uses default", func(t *testing.T) {
		service := NewJWTService("")
		assert.NotNil(t, service)
		assert.Equal(t, []byte("shared-secret-key"), service.secretKey)
	})
}

func TestJWTService_GenerateToken(t *testing.T) {
	service := NewJWTService("test-secret")
	userID := uuid.New().String()
	tenantID := uuid.New().String()
	email := "test@example.com"
	role := "admin"

	t.Run("generates valid token", func(t *testing.T) {
		token, err := service.GenerateToken(userID, tenantID, email, role)

		require.NoError(t, err)
		assert.NotEmpty(t, token)

		// Verify token structure (should have 3 parts separated by dots)
		parts := len(splitToken(token))
		assert.Equal(t, 3, parts)
	})

	t.Run("token contains correct claims", func(t *testing.T) {
		token, err := service.GenerateToken(userID, tenantID, email, role)
		require.NoError(t, err)

		// Parse and verify claims
		parsedToken, err := jwt.ParseWithClaims(token, &Claims{}, func(token *jwt.Token) (interface{}, error) {
			return service.secretKey, nil
		})
		require.NoError(t, err)
		require.True(t, parsedToken.Valid)

		claims, ok := parsedToken.Claims.(*Claims)
		require.True(t, ok)

		assert.Equal(t, userID, claims.UserID)
		assert.Equal(t, tenantID, claims.TenantID)
		assert.Equal(t, email, claims.Email)
		assert.Equal(t, role, claims.Role)

		// Verify time claims
		now := time.Now()
		assert.True(t, claims.ExpiresAt.Time.After(now))
		assert.True(t, claims.IssuedAt.Time.Before(now.Add(time.Minute)))
		assert.True(t, claims.NotBefore.Time.Before(now.Add(time.Minute)))
	})

	t.Run("different tokens for same user", func(t *testing.T) {
		token1, err1 := service.GenerateToken(userID, tenantID, email, role)
		time.Sleep(time.Millisecond) // Ensure different issued time
		token2, err2 := service.GenerateToken(userID, tenantID, email, role)

		require.NoError(t, err1)
		require.NoError(t, err2)
		assert.NotEqual(t, token1, token2) // Different iat should make tokens different
	})

	t.Run("handles empty parameters", func(t *testing.T) {
		token, err := service.GenerateToken("", "", "", "")

		require.NoError(t, err)
		assert.NotEmpty(t, token)

		claims, err := service.ValidateToken(token)
		require.NoError(t, err)
		assert.Empty(t, claims.UserID)
		assert.Empty(t, claims.TenantID)
		assert.Empty(t, claims.Email)
		assert.Empty(t, claims.Role)
	})
}

func TestJWTService_GenerateRefreshToken(t *testing.T) {
	service := NewJWTService("test-secret")
	userID := uuid.New().String()

	t.Run("generates valid refresh token", func(t *testing.T) {
		token, err := service.GenerateRefreshToken(userID)

		require.NoError(t, err)
		assert.NotEmpty(t, token)

		// Verify token structure
		parts := len(splitToken(token))
		assert.Equal(t, 3, parts)
	})

	t.Run("refresh token contains correct claims", func(t *testing.T) {
		token, err := service.GenerateRefreshToken(userID)
		require.NoError(t, err)

		// Parse and verify claims
		parsedToken, err := jwt.ParseWithClaims(token, &RefreshClaims{}, func(token *jwt.Token) (interface{}, error) {
			return service.secretKey, nil
		})
		require.NoError(t, err)
		require.True(t, parsedToken.Valid)

		claims, ok := parsedToken.Claims.(*RefreshClaims)
		require.True(t, ok)

		assert.Equal(t, userID, claims.UserID)

		// Verify expiration is 7 days
		now := time.Now()
		expectedExpiry := now.Add(7 * 24 * time.Hour)
		assert.True(t, claims.ExpiresAt.Time.After(now.Add(6*24*time.Hour)))
		assert.True(t, claims.ExpiresAt.Time.Before(expectedExpiry.Add(time.Minute)))
	})

	t.Run("handles empty user ID", func(t *testing.T) {
		token, err := service.GenerateRefreshToken("")

		require.NoError(t, err)
		assert.NotEmpty(t, token)

		claims, err := service.ValidateRefreshToken(token)
		require.NoError(t, err)
		assert.Empty(t, claims.UserID)
	})
}

func TestJWTService_ValidateToken(t *testing.T) {
	service := NewJWTService("test-secret")
	userID := uuid.New().String()
	tenantID := uuid.New().String()
	email := "test@example.com"
	role := "manager"

	t.Run("validates correct token", func(t *testing.T) {
		token, err := service.GenerateToken(userID, tenantID, email, role)
		require.NoError(t, err)

		claims, err := service.ValidateToken(token)

		require.NoError(t, err)
		assert.Equal(t, userID, claims.UserID)
		assert.Equal(t, tenantID, claims.TenantID)
		assert.Equal(t, email, claims.Email)
		assert.Equal(t, role, claims.Role)
	})

	t.Run("rejects invalid token format", func(t *testing.T) {
		invalidTokens := []string{
			"",
			"invalid",
			"invalid.token",
			"invalid.token.format.extra",
		}

		for _, invalidToken := range invalidTokens {
			claims, err := service.ValidateToken(invalidToken)
			assert.Error(t, err)
			assert.Nil(t, claims)
		}
	})

	t.Run("rejects token with wrong secret", func(t *testing.T) {
		wrongService := NewJWTService("wrong-secret")
		token, err := service.GenerateToken(userID, tenantID, email, role)
		require.NoError(t, err)

		claims, err := wrongService.ValidateToken(token)

		assert.Error(t, err)
		assert.Nil(t, claims)
		assert.Contains(t, err.Error(), "failed to parse token")
	})

	t.Run("rejects expired token", func(t *testing.T) {
		// Create service that generates tokens with very short expiry
		shortLivedService := &JWTService{secretKey: []byte("test")}

		// Manually create an expired token
		claims := &Claims{
			UserID:   userID,
			TenantID: tenantID,
			Email:    email,
			Role:     role,
			RegisteredClaims: jwt.RegisteredClaims{
				ExpiresAt: jwt.NewNumericDate(time.Now().Add(-time.Hour)), // Expired
				IssuedAt:  jwt.NewNumericDate(time.Now().Add(-2 * time.Hour)),
				NotBefore: jwt.NewNumericDate(time.Now().Add(-2 * time.Hour)),
			},
		}

		token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
		tokenString, err := token.SignedString(shortLivedService.secretKey)
		require.NoError(t, err)

		validatedClaims, err := shortLivedService.ValidateToken(tokenString)

		assert.Error(t, err)
		assert.Nil(t, validatedClaims)
		assert.Contains(t, err.Error(), "failed to parse token")
	})

	t.Run("rejects token with wrong algorithm", func(t *testing.T) {
		// Create token with RS256 instead of HS256
		claims := &Claims{
			UserID:   userID,
			TenantID: tenantID,
			Email:    email,
			Role:     role,
			RegisteredClaims: jwt.RegisteredClaims{
				ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour)),
				IssuedAt:  jwt.NewNumericDate(time.Now()),
				NotBefore: jwt.NewNumericDate(time.Now()),
			},
		}

		// This will fail because we're using HMAC signing with the wrong method
		token := jwt.NewWithClaims(jwt.SigningMethodNone, claims)
		tokenString, err := token.SignedString(jwt.UnsafeAllowNoneSignatureType)
		require.NoError(t, err)

		validatedClaims, err := service.ValidateToken(tokenString)

		assert.Error(t, err)
		assert.Nil(t, validatedClaims)
	})
}

func TestJWTService_ValidateRefreshToken(t *testing.T) {
	service := NewJWTService("test-secret")
	userID := uuid.New().String()

	t.Run("validates correct refresh token", func(t *testing.T) {
		token, err := service.GenerateRefreshToken(userID)
		require.NoError(t, err)

		claims, err := service.ValidateRefreshToken(token)

		require.NoError(t, err)
		assert.Equal(t, userID, claims.UserID)
	})

	t.Run("rejects invalid refresh token", func(t *testing.T) {
		claims, err := service.ValidateRefreshToken("invalid-token")

		assert.Error(t, err)
		assert.Nil(t, claims)
	})

	t.Run("rejects access token as refresh token", func(t *testing.T) {
		// Generate access token and try to validate as refresh token
		accessToken, err := service.GenerateToken(userID, uuid.New().String(), "test@example.com", "admin")
		require.NoError(t, err)

		claims, err := service.ValidateRefreshToken(accessToken)

		assert.Error(t, err)
		assert.Nil(t, claims)
	})
}

func TestJWTService_GenerateResetToken(t *testing.T) {
	service := NewJWTService("test-secret")
	email := "test@example.com"

	t.Run("generates valid reset token with default TTL", func(t *testing.T) {
		token, err := service.GenerateResetToken(email, 0)

		require.NoError(t, err)
		assert.NotEmpty(t, token)

		claims, err := service.ValidateResetToken(token)
		require.NoError(t, err)
		assert.Equal(t, email, claims.Email)

		// Should expire in about 15 minutes (default)
		now := time.Now()
		assert.True(t, claims.ExpiresAt.Time.After(now.Add(14*time.Minute)))
		assert.True(t, claims.ExpiresAt.Time.Before(now.Add(16*time.Minute)))
	})

	t.Run("generates valid reset token with custom TTL", func(t *testing.T) {
		customTTL := 30 * time.Minute
		token, err := service.GenerateResetToken(email, customTTL)

		require.NoError(t, err)
		assert.NotEmpty(t, token)

		claims, err := service.ValidateResetToken(token)
		require.NoError(t, err)
		assert.Equal(t, email, claims.Email)

		// Should expire in about 30 minutes
		now := time.Now()
		assert.True(t, claims.ExpiresAt.Time.After(now.Add(29*time.Minute)))
		assert.True(t, claims.ExpiresAt.Time.Before(now.Add(31*time.Minute)))
	})

	t.Run("handles empty email", func(t *testing.T) {
		token, err := service.GenerateResetToken("", time.Hour)

		require.NoError(t, err)
		assert.NotEmpty(t, token)

		claims, err := service.ValidateResetToken(token)
		require.NoError(t, err)
		assert.Empty(t, claims.Email)
	})
}

func TestJWTService_ValidateResetToken(t *testing.T) {
	service := NewJWTService("test-secret")
	email := "test@example.com"

	t.Run("validates correct reset token", func(t *testing.T) {
		token, err := service.GenerateResetToken(email, time.Hour)
		require.NoError(t, err)

		claims, err := service.ValidateResetToken(token)

		require.NoError(t, err)
		assert.Equal(t, email, claims.Email)
	})

	t.Run("rejects invalid reset token", func(t *testing.T) {
		claims, err := service.ValidateResetToken("invalid-token")

		assert.Error(t, err)
		assert.Nil(t, claims)
	})

	t.Run("rejects access token as reset token", func(t *testing.T) {
		// Generate access token and try to validate as reset token
		accessToken, err := service.GenerateToken(uuid.New().String(), uuid.New().String(), email, "admin")
		require.NoError(t, err)

		claims, err := service.ValidateResetToken(accessToken)

		assert.Error(t, err)
		assert.Nil(t, claims)
	})
}

func TestLegacyFunctions(t *testing.T) {
	userID := uuid.New().String()
	tenantID := uuid.New().String()

	t.Run("GenerateToken legacy function", func(t *testing.T) {
		token, err := GenerateToken(userID, tenantID, time.Hour)

		require.NoError(t, err)
		assert.NotEmpty(t, token)

		// Verify it uses default service
		claims, err := ParseToken(token)
		require.NoError(t, err)
		assert.Equal(t, userID, claims.UserID)
		assert.Equal(t, tenantID, claims.TenantID)
		assert.Empty(t, claims.Email) // Legacy function doesn't set email
		assert.Empty(t, claims.Role)  // Legacy function doesn't set role
	})

	t.Run("ParseToken legacy function", func(t *testing.T) {
		token, err := GenerateToken(userID, tenantID, time.Hour)
		require.NoError(t, err)

		claims, err := ParseToken(token)

		require.NoError(t, err)
		assert.Equal(t, userID, claims.UserID)
		assert.Equal(t, tenantID, claims.TenantID)
	})

	t.Run("ParseToken with invalid token", func(t *testing.T) {
		claims, err := ParseToken("invalid-token")

		assert.Error(t, err)
		assert.Nil(t, claims)
	})
}

func TestJWTService_CrossValidation(t *testing.T) {
	t.Run("service with same secret can validate each other's tokens", func(t *testing.T) {
		secret := "shared-secret"
		service1 := NewJWTService(secret)
		service2 := NewJWTService(secret)

		userID := uuid.New().String()
		tenantID := uuid.New().String()
		email := "test@example.com"
		role := "admin"

		// Generate token with service1
		token, err := service1.GenerateToken(userID, tenantID, email, role)
		require.NoError(t, err)

		// Validate with service2
		claims, err := service2.ValidateToken(token)
		require.NoError(t, err)
		assert.Equal(t, userID, claims.UserID)
		assert.Equal(t, tenantID, claims.TenantID)
		assert.Equal(t, email, claims.Email)
		assert.Equal(t, role, claims.Role)
	})

	t.Run("services with different secrets cannot validate each other's tokens", func(t *testing.T) {
		service1 := NewJWTService("secret1")
		service2 := NewJWTService("secret2")

		userID := uuid.New().String()
		tenantID := uuid.New().String()

		// Generate token with service1
		token, err := service1.GenerateToken(userID, tenantID, "test@example.com", "admin")
		require.NoError(t, err)

		// Try to validate with service2
		claims, err := service2.ValidateToken(token)
		assert.Error(t, err)
		assert.Nil(t, claims)
	})
}

// Helper function to split JWT token into parts
func splitToken(token string) []string {
	parts := make([]string, 0, 3)
	start := 0
	for i, c := range token {
		if c == '.' {
			parts = append(parts, token[start:i])
			start = i + 1
		}
	}
	parts = append(parts, token[start:])
	return parts
}

func BenchmarkJWTService_GenerateToken(b *testing.B) {
	service := NewJWTService("benchmark-secret")
	userID := uuid.New().String()
	tenantID := uuid.New().String()
	email := "benchmark@example.com"
	role := "admin"

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, err := service.GenerateToken(userID, tenantID, email, role)
		if err != nil {
			b.Fatal(err)
		}
	}
}

func BenchmarkJWTService_ValidateToken(b *testing.B) {
	service := NewJWTService("benchmark-secret")
	token, err := service.GenerateToken(
		uuid.New().String(),
		uuid.New().String(),
		"benchmark@example.com",
		"admin",
	)
	if err != nil {
		b.Fatal(err)
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, err := service.ValidateToken(token)
		if err != nil {
			b.Fatal(err)
		}
	}
}
