package auth

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"os"
	"strconv"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/rs/zerolog/log"
)

// Token blacklist for revoked tokens
var (
	tokenBlacklist = make(map[string]time.Time)
	blacklistMutex sync.RWMutex
	jwtKey         = []byte("shared-secret-key") // In production, this should come from environment
)

// Enhanced Claims with security metadata
type Claims struct {
	UserID    string `json:"user_id"`
	TenantID  string `json:"tenant_id"`
	Email     string `json:"email"`
	Role      string `json:"role"`
	TokenID   string `json:"token_id"`   // Unique token identifier for revocation
	IPAddress string `json:"ip_addr"`    // Client IP for security tracking
	UserAgent string `json:"user_agent"` // Client user agent for security
	jwt.RegisteredClaims
}

type RefreshClaims struct {
	UserID    string `json:"user_id"`
	TokenID   string `json:"token_id"`
	IPAddress string `json:"ip_addr"`
	jwt.RegisteredClaims
}

// ResetClaims are short-lived claims for password reset (stateless).
type ResetClaims struct {
	Email string `json:"email"`
	jwt.RegisteredClaims
}

// Security configuration
type SecurityConfig struct {
	AccessTokenTTL  time.Duration
	RefreshTokenTTL time.Duration
	ResetTokenTTL   time.Duration
	Issuer          string
	Audience        string
}

type JWTService struct {
	secretKey      []byte
	config         SecurityConfig
	blacklistTTL   time.Duration
}

func NewJWTService(secretKey string) *JWTService {
	if secretKey == "" {
		secretKey = "shared-secret-key" // Default for development
	}

	// Load security configuration from environment
	config := SecurityConfig{
		AccessTokenTTL:  15 * time.Minute, // Shorter for better security
		RefreshTokenTTL: 7 * 24 * time.Hour,
		ResetTokenTTL:   15 * time.Minute,
		Issuer:          getEnvOrDefault("JWT_ISSUER", "agromart-api"),
		Audience:        getEnvOrDefault("JWT_AUDIENCE", "agromart-client"),
	}

	// Override with environment variables if set
	if ttl := os.Getenv("JWT_ACCESS_TTL_MINUTES"); ttl != "" {
		if minutes, err := strconv.Atoi(ttl); err == nil {
			config.AccessTokenTTL = time.Duration(minutes) * time.Minute
		}
	}

	if ttl := os.Getenv("JWT_REFRESH_TTL_HOURS"); ttl != "" {
		if hours, err := strconv.Atoi(ttl); err == nil {
			config.RefreshTokenTTL = time.Duration(hours) * time.Hour
		}
	}

	return &JWTService{
		secretKey:    []byte(secretKey),
		config:       config,
		blacklistTTL: 7 * 24 * time.Hour, // Keep blacklisted tokens for 7 days
	}
}

// Helper function to get environment variable with default
func getEnvOrDefault(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

// GenerateToken creates a new access token with enhanced security metadata
func (j *JWTService) GenerateToken(userID, tenantID, email, role, ipAddress, userAgent string) (string, error) {
	tokenID, err := generateTokenID()
	if err != nil {
		return "", fmt.Errorf("failed to generate token ID: %w", err)
	}

	claims := &Claims{
		UserID:    userID,
		TenantID:  tenantID,
		Email:     email,
		Role:      role,
		TokenID:   tokenID,
		IPAddress: ipAddress,
		UserAgent: userAgent,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(j.config.AccessTokenTTL)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
			Issuer:    j.config.Issuer,
			Audience:  jwt.ClaimStrings{j.config.Audience},
			Subject:   userID,
			ID:        tokenID,
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(j.secretKey)
}

// GenerateTokenLegacy maintains backward compatibility
func (j *JWTService) GenerateTokenLegacy(userID, tenantID, email, role string) (string, error) {
	return j.GenerateToken(userID, tenantID, email, role, "", "")
}

// generateTokenID creates a unique token identifier
func generateTokenID() (string, error) {
	bytes := make([]byte, 16)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}

// AddToBlacklist adds a token to the blacklist
func (j *JWTService) AddToBlacklist(tokenID string) {
	blacklistMutex.Lock()
	defer blacklistMutex.Unlock()
	tokenBlacklist[tokenID] = time.Now().Add(j.blacklistTTL)
}

// IsBlacklisted checks if a token is blacklisted
func (j *JWTService) IsBlacklisted(tokenID string) bool {
	blacklistMutex.RLock()
	defer blacklistMutex.RUnlock()

	expiry, exists := tokenBlacklist[tokenID]
	if !exists {
		return false
	}

	// Remove expired blacklist entries
	if time.Now().After(expiry) {
		blacklistMutex.RUnlock()
		blacklistMutex.Lock()
		delete(tokenBlacklist, tokenID)
		blacklistMutex.Unlock()
		return false
	}

	return true
}

// RevokeToken adds a token to blacklist (alias for AddToBlacklist)
func (j *JWTService) RevokeToken(tokenID string) {
	j.AddToBlacklist(tokenID)
}

func (j *JWTService) GenerateRefreshToken(userID, ipAddress string) (string, error) {
	tokenID, err := generateTokenID()
	if err != nil {
		return "", fmt.Errorf("failed to generate refresh token ID: %w", err)
	}

	claims := &RefreshClaims{
		UserID:    userID,
		TokenID:   tokenID,
		IPAddress: ipAddress,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(j.config.RefreshTokenTTL)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
			Issuer:    j.config.Issuer,
			Audience:  jwt.ClaimStrings{j.config.Audience},
			Subject:   userID,
			ID:        tokenID,
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(j.secretKey)
}

func (j *JWTService) ValidateToken(tokenStr string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenStr, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		// Validate signing method
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			log.Warn().Str("method", fmt.Sprintf("%v", token.Header["alg"])).Msg("Unexpected signing method")
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return j.secretKey, nil
	})

	if err != nil {
		log.Error().Err(err).Msg("Failed to parse token")
		return nil, fmt.Errorf("failed to parse token: %w", err)
	}

	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		log.Warn().Msg("Invalid token claims or token not valid")
		return nil, fmt.Errorf("invalid token")
	}

	// Check if token is blacklisted
	if claims.TokenID != "" && j.IsBlacklisted(claims.TokenID) {
		log.Warn().Str("token_id", claims.TokenID).Str("user_id", claims.UserID).Msg("Token is blacklisted")
		return nil, fmt.Errorf("token has been revoked")
	}

	// Validate issuer and audience
	if claims.Issuer != j.config.Issuer {
		log.Warn().Str("expected", j.config.Issuer).Str("actual", claims.Issuer).Msg("Invalid token issuer")
		return nil, fmt.Errorf("invalid token issuer")
	}

	if len(claims.Audience) > 0 {
		found := false
		for _, audience := range claims.Audience {
			if audience == j.config.Audience {
				found = true
				break
			}
		}
		if !found {
			log.Warn().Str("expected", j.config.Audience).Strs("actual", claims.Audience).Msg("Invalid token audience")
			return nil, fmt.Errorf("invalid token audience")
		}
	}

	// Additional security logging for monitoring
	log.Info().
		Str("user_id", claims.UserID).
		Str("token_id", claims.TokenID).
		Str("ip", claims.IPAddress).
		Msg("Token validated successfully")

	return claims, nil
}

// GenerateResetToken creates a short-lived JWT carrying the email for reset.
func (j *JWTService) GenerateResetToken(email string, ttl time.Duration) (string, error) {
	if ttl <= 0 {
		ttl = 15 * time.Minute
	}
	claims := &ResetClaims{
		Email: email,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(ttl)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(j.secretKey)
}

// ValidateResetToken validates a reset token and returns its claims.
func (j *JWTService) ValidateResetToken(tokenStr string) (*ResetClaims, error) {
	token, err := jwt.ParseWithClaims(tokenStr, &ResetClaims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return j.secretKey, nil
	})
	if err != nil {
		return nil, fmt.Errorf("failed to parse reset token: %w", err)
	}
	claims, ok := token.Claims.(*ResetClaims)
	if !ok || !token.Valid {
		return nil, fmt.Errorf("invalid reset token")
	}
	return claims, nil
}

func (j *JWTService) ValidateRefreshToken(tokenStr string) (*RefreshClaims, error) {
	token, err := jwt.ParseWithClaims(tokenStr, &RefreshClaims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			log.Warn().Str("method", fmt.Sprintf("%v", token.Header["alg"])).Msg("Unexpected signing method in refresh token")
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return j.secretKey, nil
	})

	if err != nil {
		log.Error().Err(err).Msg("Failed to parse refresh token")
		return nil, fmt.Errorf("failed to parse refresh token: %w", err)
	}

	claims, ok := token.Claims.(*RefreshClaims)
	if !ok || !token.Valid {
		log.Warn().Msg("Invalid refresh token claims or token not valid")
		return nil, fmt.Errorf("invalid refresh token")
	}

	// Check if refresh token is blacklisted
	if claims.TokenID != "" && j.IsBlacklisted(claims.TokenID) {
		log.Warn().Str("token_id", claims.TokenID).Str("user_id", claims.UserID).Msg("Refresh token is blacklisted")
		return nil, fmt.Errorf("refresh token has been revoked")
	}

	// Validate issuer and audience for refresh token
	if claims.Issuer != j.config.Issuer {
		log.Warn().Str("expected", j.config.Issuer).Str("actual", claims.Issuer).Msg("Invalid refresh token issuer")
		return nil, fmt.Errorf("invalid refresh token issuer")
	}

	if len(claims.Audience) > 0 {
		found := false
		for _, audience := range claims.Audience {
			if audience == j.config.Audience {
				found = true
				break
			}
		}
		if !found {
			log.Warn().Str("expected", j.config.Audience).Strs("actual", claims.Audience).Msg("Invalid refresh token audience")
			return nil, fmt.Errorf("invalid refresh token audience")
		}
	}

	log.Info().
		Str("user_id", claims.UserID).
		Str("token_id", claims.TokenID).
		Str("ip", claims.IPAddress).
		Msg("Refresh token validated successfully")

	return claims, nil
}

// Legacy functions for backward compatibility
func GenerateToken(userID string, tenantID string, expiration time.Duration) (string, error) {
	service := NewJWTService("")
	return service.GenerateTokenLegacy(userID, tenantID, "", "")
}

func ParseToken(tokenStr string) (*Claims, error) {
	service := NewJWTService("")
	return service.ValidateToken(tokenStr)
}
