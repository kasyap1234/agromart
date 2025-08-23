package middleware

import (
	"net/http"
	"strconv"
	"sync"
	"time"

	"github.com/labstack/echo/v4"
)

// RateLimitConfig holds rate limiting configuration
type RateLimitConfig struct {
	Requests   int           // Number of requests allowed
	Window     time.Duration // Time window for rate limiting
	Burst      int           // Burst capacity
	SkipRoutes []string      // Routes to skip rate limiting
}

// DefaultRateLimitConfig returns default rate limiting configuration
func DefaultRateLimitConfig() RateLimitConfig {
	return RateLimitConfig{
		Requests:   1000,
		Window:     time.Hour,
		Burst:      100,
		SkipRoutes: []string{"/health", "/metrics"},
	}
}

// IPRateLimiter implements token bucket rate limiting per IP
type IPRateLimiter struct {
	visitors map[string]*visitor
	mutex    sync.RWMutex
	config   RateLimitConfig
}

type visitor struct {
	tokens    int
	lastSeen  time.Time
	lastRefill time.Time
}

// NewIPRateLimiter creates a new IP-based rate limiter
func NewIPRateLimiter(config RateLimitConfig) *IPRateLimiter {
	limiter := &IPRateLimiter{
		visitors: make(map[string]*visitor),
		config:   config,
	}

	// Start cleanup goroutine
	go limiter.cleanup()
	return limiter
}

// Allow checks if the request should be allowed
func (rl *IPRateLimiter) Allow(ip string) bool {
	rl.mutex.Lock()
	defer rl.mutex.Unlock()

	now := time.Now()
	v, exists := rl.visitors[ip]

	if !exists {
		// First time visitor
		rl.visitors[ip] = &visitor{
			tokens:     rl.config.Burst - 1,
			lastSeen:   now,
			lastRefill: now,
		}
		return true
	}

	// Refill tokens based on time elapsed
	timePassed := now.Sub(v.lastRefill)
	tokensToAdd := int(timePassed / (rl.config.Window / time.Duration(rl.config.Requests)))

	if tokensToAdd > 0 {
		v.tokens = min(rl.config.Burst, v.tokens+tokensToAdd)
		v.lastRefill = now
	}

	if v.tokens > 0 {
		v.tokens--
		v.lastSeen = now
		return true
	}

	return false
}

// RateLimitMiddleware returns an Echo middleware for rate limiting
func RateLimitMiddleware(config RateLimitConfig) echo.MiddlewareFunc {
	limiter := NewIPRateLimiter(config)

	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			// Skip rate limiting for specified routes
			for _, skipRoute := range config.SkipRoutes {
				if c.Path() == skipRoute {
					return next(c)
				}
			}

			// Get client IP
			ip := c.RealIP()

			// Check rate limit
			if !limiter.Allow(ip) {
				return c.JSON(http.StatusTooManyRequests, map[string]interface{}{
					"error": "Rate limit exceeded",
					"retry_after": int(config.Window.Seconds()),
				})
			}

			// Add rate limit headers
			remaining := limiter.getRemainingTokens(ip)
			resetTime := time.Now().Add(config.Window)

			c.Response().Header().Set("X-RateLimit-Limit", strconv.Itoa(config.Requests))
			c.Response().Header().Set("X-RateLimit-Remaining", strconv.Itoa(remaining))
			c.Response().Header().Set("X-RateLimit-Reset", strconv.FormatInt(resetTime.Unix(), 10))

			return next(c)
		}
	}
}

// getRemainingTokens returns remaining tokens for an IP
func (rl *IPRateLimiter) getRemainingTokens(ip string) int {
	rl.mutex.RLock()
	defer rl.mutex.RUnlock()

	if v, exists := rl.visitors[ip]; exists {
		return v.tokens
	}
	return rl.config.Burst
}

// cleanup removes old visitors to prevent memory leaks
func (rl *IPRateLimiter) cleanup() {
	ticker := time.NewTicker(10 * time.Minute)
	defer ticker.Stop()

	for range ticker.C {
		rl.mutex.Lock()
		now := time.Now()
		for ip, v := range rl.visitors {
			if now.Sub(v.lastSeen) > rl.config.Window*2 {
				delete(rl.visitors, ip)
			}
		}
		rl.mutex.Unlock()
	}
}

// UserRateLimiter implements user-based rate limiting
type UserRateLimiter struct {
	users  map[string]*visitor
	mutex  sync.RWMutex
	config RateLimitConfig
}

// NewUserRateLimiter creates a new user-based rate limiter
func NewUserRateLimiter(config RateLimitConfig) *UserRateLimiter {
	limiter := &UserRateLimiter{
		users:   make(map[string]*visitor),
		config:  config,
	}

	// Start cleanup goroutine
	go limiter.cleanup()
	return limiter
}

// Allow checks if the user request should be allowed
func (rl *UserRateLimiter) Allow(userID string) bool {
	rl.mutex.Lock()
	defer rl.mutex.Unlock()

	now := time.Now()
	v, exists := rl.users[userID]

	if !exists {
		// First time user
		rl.users[userID] = &visitor{
			tokens:     rl.config.Burst - 1,
			lastSeen:   now,
			lastRefill: now,
		}
		return true
	}

	// Refill tokens based on time elapsed
	timePassed := now.Sub(v.lastRefill)
	tokensToAdd := int(timePassed / (rl.config.Window / time.Duration(rl.config.Requests)))

	if tokensToAdd > 0 {
		v.tokens = min(rl.config.Burst, v.tokens+tokensToAdd)
		v.lastRefill = now
	}

	if v.tokens > 0 {
		v.tokens--
		v.lastSeen = now
		return true
	}

	return false
}

// cleanup removes old users to prevent memory leaks
func (rl *UserRateLimiter) cleanup() {
	ticker := time.NewTicker(15 * time.Minute)
	defer ticker.Stop()

	for range ticker.C {
		rl.mutex.Lock()
		now := time.Now()
		for userID, v := range rl.users {
			if now.Sub(v.lastSeen) > rl.config.Window*2 {
				delete(rl.users, userID)
			}
		}
		rl.mutex.Unlock()
	}
}

// UserRateLimitMiddleware returns user-based rate limiting middleware
func UserRateLimitMiddleware(config RateLimitConfig) echo.MiddlewareFunc {
	limiter := NewUserRateLimiter(config)

	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			// Get user ID from context (set by auth middleware)
			userID := c.Get("user_id")
			if userID == nil {
				// Fallback to IP-based limiting if no user ID
				ip := c.RealIP()
				if !limiter.Allow(ip) {
					return c.JSON(http.StatusTooManyRequests, map[string]interface{}{
						"error": "Rate limit exceeded",
						"retry_after": int(config.Window.Seconds()),
					})
				}
				return next(c)
			}

			// Check user rate limit
			if !limiter.Allow(userID.(string)) {
				return c.JSON(http.StatusTooManyRequests, map[string]interface{}{
					"error": "Rate limit exceeded",
					"retry_after": int(config.Window.Seconds()),
				})
			}

			return next(c)
		}
	}
}

// min returns the minimum of two integers
func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}