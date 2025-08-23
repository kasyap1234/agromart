package middleware

import (
	"crypto/rand"
	"encoding/hex"
	"net"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/rs/zerolog/log"
	"golang.org/x/time/rate"
)

// SecurityConfig holds security middleware configuration
type SecurityConfig struct {
	EnableCSRF         bool
	EnableRateLimit    bool
	EnableRequestSize  bool
	EnableIPWhitelist  bool
	EnableSuspiciousIP bool
	CSRFTokenName      string
	MaxRequestSize     int64
	RateLimitRequests  int
	RateLimitDuration  time.Duration
	TrustedIPs         []string
	SuspiciousIPs      []string
	BlockedUserAgents  []string
}

// DefaultSecurityConfig returns a secure default configuration
func DefaultSecurityConfig() *SecurityConfig {
	return &SecurityConfig{
		EnableCSRF:         true,
		EnableRateLimit:    true,
		EnableRequestSize:  true,
		EnableIPWhitelist:  false,
		EnableSuspiciousIP: true,
		CSRFTokenName:      "csrf_token",
		MaxRequestSize:     10 << 20, // 10MB
		RateLimitRequests:  100,
		RateLimitDuration:  time.Minute,
		TrustedIPs:         []string{},
		SuspiciousIPs:      []string{},
		BlockedUserAgents:  []string{"sqlmap", "nmap", "nikto", "dirbuster"},
	}
}

// SecurityMiddleware provides comprehensive security middleware
type SecurityMiddleware struct {
	config       *SecurityConfig
	csrfTokens   map[string]time.Time
	csrfMutex    sync.RWMutex
	rateLimiters map[string]*rate.Limiter
	rateMutex    sync.RWMutex
}

// NewSecurityMiddleware creates a new security middleware instance
func NewSecurityMiddleware(config *SecurityConfig) *SecurityMiddleware {
	if config == nil {
		config = DefaultSecurityConfig()
	}

	return &SecurityMiddleware{
		config:       config,
		csrfTokens:   make(map[string]time.Time),
		rateLimiters: make(map[string]*rate.Limiter),
	}
}

// CSRFProtection middleware provides CSRF protection
func (sm *SecurityMiddleware) CSRFProtection() echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			if !sm.config.EnableCSRF {
				return next(c)
			}

			// Skip CSRF for safe methods
			if c.Request().Method == http.MethodGet ||
			   c.Request().Method == http.MethodHead ||
			   c.Request().Method == http.MethodOptions {
				return next(c)
			}

			// Skip CSRF for API endpoints that use JWT
			if strings.HasPrefix(c.Request().URL.Path, "/api/") &&
			   c.Request().Header.Get("Authorization") != "" {
				return next(c)
			}

			// Get CSRF token from header or form
			token := c.Request().Header.Get("X-CSRF-Token")
			if token == "" {
				token = c.FormValue(sm.config.CSRFTokenName)
			}
			if token == "" {
				return echo.NewHTTPError(http.StatusForbidden, "CSRF token missing")
			}

			// Validate token
			if !sm.isValidCSRFToken(token) {
				log.Warn().
					Str("token", token).
					Str("ip", c.RealIP()).
					Str("path", c.Request().URL.Path).
					Msg("Invalid CSRF token")
				return echo.NewHTTPError(http.StatusForbidden, "Invalid CSRF token")
			}

			// Generate new token for next request
			newToken, err := sm.generateCSRFToken()
			if err != nil {
				log.Error().Err(err).Msg("Failed to generate CSRF token")
				return echo.NewHTTPError(http.StatusInternalServerError, "Failed to generate CSRF token")
			}

			c.Response().Header().Set("X-CSRF-Token", newToken)

			return next(c)
		}
	}
}

// GenerateCSRFToken generates a new CSRF token and returns it
func (sm *SecurityMiddleware) GenerateCSRFToken() (string, error) {
	return sm.generateCSRFToken()
}

// generateCSRFToken generates a cryptographically secure CSRF token
func (sm *SecurityMiddleware) generateCSRFToken() (string, error) {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	token := hex.EncodeToString(bytes)

	// Store token with expiration
	sm.csrfMutex.Lock()
	sm.csrfTokens[token] = time.Now().Add(1 * time.Hour) // 1 hour expiration
	sm.csrfMutex.Unlock()

	return token, nil
}

// isValidCSRFToken checks if a CSRF token is valid and not expired
func (sm *SecurityMiddleware) isValidCSRFToken(token string) bool {
	sm.csrfMutex.RLock()
	expiry, exists := sm.csrfTokens[token]
	sm.csrfMutex.RUnlock()

	if !exists {
		return false
	}

	// Check if token has expired
	if time.Now().After(expiry) {
		// Clean up expired token
		sm.csrfMutex.Lock()
		delete(sm.csrfTokens, token)
		sm.csrfMutex.Unlock()
		return false
	}

	return true
}

// RateLimit middleware provides rate limiting protection
func (sm *SecurityMiddleware) RateLimit() echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			if !sm.config.EnableRateLimit {
				return next(c)
			}

			// Use IP address for rate limiting
			clientIP := c.RealIP()

			// Get or create rate limiter for this IP
			sm.rateMutex.Lock()
			limiter, exists := sm.rateLimiters[clientIP]
			if !exists {
				// Calculate rate: requests per second
				ratePerSecond := float64(sm.config.RateLimitRequests) / sm.config.RateLimitDuration.Seconds()
				limiter = rate.NewLimiter(rate.Limit(ratePerSecond), sm.config.RateLimitRequests)
				sm.rateLimiters[clientIP] = limiter
			}
			sm.rateMutex.Unlock()

			// Check rate limit
			if !limiter.Allow() {
				log.Warn().
					Str("ip", clientIP).
					Str("path", c.Request().URL.Path).
					Msg("Rate limit exceeded")

				return echo.NewHTTPError(http.StatusTooManyRequests, "Rate limit exceeded. Please try again later.")
			}

			return next(c)
		}
	}
}

// RequestSizeLimit middleware limits request body size
func (sm *SecurityMiddleware) RequestSizeLimit() echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			if !sm.config.EnableRequestSize {
				return next(c)
			}

			// Set maximum request size
			c.Request().Body = http.MaxBytesReader(c.Response().Writer, c.Request().Body, sm.config.MaxRequestSize)

			return next(c)
		}
	}
}

// SecurityHeaders middleware adds security headers
func (sm *SecurityMiddleware) SecurityHeaders() echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			// Set security headers
			headers := c.Response().Header()

			// Prevent clickjacking
			headers.Set("X-Frame-Options", "DENY")

			// Prevent MIME type sniffing
			headers.Set("X-Content-Type-Options", "nosniff")

			// XSS protection
			headers.Set("X-XSS-Protection", "1; mode=block")

			// Referrer policy
			headers.Set("Referrer-Policy", "strict-origin-when-cross-origin")

			// Content Security Policy (restrictive default)
			headers.Set("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self';")

			// Permissions policy
			headers.Set("Permissions-Policy", "camera=(), microphone=(), geolocation=()")

			return next(c)
		}
	}
}

// SuspiciousRequestDetection detects and blocks suspicious requests
func (sm *SecurityMiddleware) SuspiciousRequestDetection() echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			// Check user agent for blocked patterns
			userAgent := c.Request().UserAgent()
			for _, blocked := range sm.config.BlockedUserAgents {
				if strings.Contains(strings.ToLower(userAgent), strings.ToLower(blocked)) {
					log.Warn().
						Str("user_agent", userAgent).
						Str("ip", c.RealIP()).
						Str("blocked_pattern", blocked).
						Msg("Blocked user agent detected")
					return echo.NewHTTPError(http.StatusForbidden, "Access denied")
				}
			}

			// Check for suspicious request patterns
			if sm.isSuspiciousRequest(c) {
				log.Warn().
					Str("ip", c.RealIP()).
					Str("path", c.Request().URL.Path).
					Str("user_agent", userAgent).
					Msg("Suspicious request detected")
				return echo.NewHTTPError(http.StatusForbidden, "Suspicious request detected")
			}

			return next(c)
		}
	}
}

// isSuspiciousRequest checks for various attack patterns
func (sm *SecurityMiddleware) isSuspiciousRequest(c echo.Context) bool {
	// Check for SQL injection patterns
	sqlPatterns := []string{
		"' OR '1'='1",
		"' OR 1=1",
		"UNION SELECT",
		"SELECT * FROM",
		"DROP TABLE",
		"INSERT INTO",
		"UPDATE users SET",
	}

	url := c.Request().URL.String()
	query := c.Request().URL.RawQuery
	userAgent := c.Request().UserAgent()

	for _, pattern := range sqlPatterns {
		if strings.Contains(strings.ToUpper(url), strings.ToUpper(pattern)) ||
		   strings.Contains(strings.ToUpper(query), strings.ToUpper(pattern)) {
			return true
		}
	}

	// Check for path traversal attempts
	if strings.Contains(url, "../") || strings.Contains(url, "..\\") {
		return true
	}

	// Check for null byte attacks
	if strings.Contains(url, "\x00") || strings.Contains(query, "\x00") {
		return true
	}

	// Check for suspicious user agents
	suspiciousAgents := []string{
		"sqlmap",
		"nmap",
		"nikto",
		"dirbuster",
		"masscan",
		"zmap",
		"hydra",
		"metasploit",
	}

	userAgentLower := strings.ToLower(userAgent)
	for _, agent := range suspiciousAgents {
		if strings.Contains(userAgentLower, agent) {
			return true
		}
	}

	return false
}

// IPWhitelist middleware restricts access to trusted IPs
func (sm *SecurityMiddleware) IPWhitelist() echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			if !sm.config.EnableIPWhitelist || len(sm.config.TrustedIPs) == 0 {
				return next(c)
			}

			clientIP := c.RealIP()
			if !sm.isIPInList(clientIP, sm.config.TrustedIPs) {
				log.Warn().
					Str("ip", clientIP).
					Str("path", c.Request().URL.Path).
					Msg("IP not in whitelist")
				return echo.NewHTTPError(http.StatusForbidden, "Access denied")
			}

			return next(c)
		}
	}
}

// IPSBlacklist middleware blocks known suspicious IPs
func (sm *SecurityMiddleware) IPBlacklist() echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			if !sm.config.EnableSuspiciousIP || len(sm.config.SuspiciousIPs) == 0 {
				return next(c)
			}

			clientIP := c.RealIP()
			if sm.isIPInList(clientIP, sm.config.SuspiciousIPs) {
				log.Warn().
					Str("ip", clientIP).
					Str("path", c.Request().URL.Path).
					Msg("IP in blacklist")
				return echo.NewHTTPError(http.StatusForbidden, "Access denied")
			}

			return next(c)
		}
	}
}

// isIPInList checks if an IP address is in a given list
func (sm *SecurityMiddleware) isIPInList(clientIP string, ipList []string) bool {
	// Parse client IP
	ip := net.ParseIP(clientIP)
	if ip == nil {
		return false
	}

	for _, ipPattern := range ipList {
		// Check for CIDR notation
		if strings.Contains(ipPattern, "/") {
			_, ipNet, err := net.ParseCIDR(ipPattern)
			if err == nil && ipNet.Contains(ip) {
				return true
			}
		} else {
			// Direct IP match
			if ipPattern == clientIP {
				return true
			}
		}
	}

	return false
}

// CleanupExpiredTokens removes expired CSRF and rate limiting data
func (sm *SecurityMiddleware) CleanupExpiredTokens() {
	ticker := time.NewTicker(30 * time.Minute) // Run cleanup every 30 minutes
	go func() {
		for range ticker.C {
			sm.cleanup()
		}
	}()
}

func (sm *SecurityMiddleware) cleanup() {
	now := time.Now()

	// Cleanup expired CSRF tokens
	sm.csrfMutex.Lock()
	for token, expiry := range sm.csrfTokens {
		if now.After(expiry) {
			delete(sm.csrfTokens, token)
		}
	}
	sm.csrfMutex.Unlock()

	// Note: Rate limiters are cleaned up automatically by Go's GC
	// when they become unreachable, so no explicit cleanup needed
}

// GetSecurityMetrics returns security metrics for monitoring
func (sm *SecurityMiddleware) GetSecurityMetrics() map[string]interface{} {
	sm.csrfMutex.RLock()
	csrfTokenCount := len(sm.csrfTokens)
	sm.csrfMutex.RUnlock()

	sm.rateMutex.RLock()
	rateLimiterCount := len(sm.rateLimiters)
	sm.rateMutex.RUnlock()

	return map[string]interface{}{
		"csrf_tokens_active":    csrfTokenCount,
		"rate_limiters_active":  rateLimiterCount,
		"csrf_protection":       sm.config.EnableCSRF,
		"rate_limiting":         sm.config.EnableRateLimit,
		"request_size_limit":    sm.config.EnableRequestSize,
		"max_request_size_mb":   sm.config.MaxRequestSize / (1024 * 1024),
		"rate_limit_requests":   sm.config.RateLimitRequests,
		"rate_limit_duration":   sm.config.RateLimitDuration.String(),
	}
}