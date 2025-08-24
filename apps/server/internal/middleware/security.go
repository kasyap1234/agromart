package middleware

import (
	"net/http"

	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
)

// SecurityHeaders middleware adds security headers to responses
func SecurityHeaders() echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			// Set security headers
			c.Response().Header().Set("X-Content-Type-Options", "nosniff")
			c.Response().Header().Set("X-Frame-Options", "DENY")
			c.Response().Header().Set("X-XSS-Protection", "1; mode=block")
			c.Response().Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")

			// Content Security Policy
			c.Response().Header().Set("Content-Security-Policy",
				"default-src 'self'; "+
					"script-src 'self' 'unsafe-inline' 'unsafe-eval'; "+
					"style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "+
					"font-src 'self' https://fonts.gstatic.com; "+
					"img-src 'self' data: https: blob:; "+
					"connect-src 'self' https://api.; "+
					"media-src 'none'; "+
					"object-src 'none'; "+
					"child-src 'none'; "+
					"worker-src 'none'; "+
					"frame-ancestors 'none'")

			// Permissions Policy
			c.Response().Header().Set("Permissions-Policy",
				"camera=(), microphone=(), geolocation=(), payment=()")

			return next(c)
		}
	}
}

// CORSMiddleware creates CORS middleware with security-focused configuration
func CORSMiddleware() echo.MiddlewareFunc {
	return middleware.CORSWithConfig(middleware.CORSConfig{
		AllowOrigins: []string{
			"http://localhost:3000",
			"http://localhost:3001",
			"http://localhost:9001", // Next.js dev server
			},
		AllowMethods: []string{
			"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS",
		},
		AllowHeaders: []string{
			"Origin", "Content-Type", "Accept", "Authorization",
			"X-Requested-With", "Content-Length", "Accept-Encoding",
			"X-CSRF-Token", "X-Debug-Client",
		},
		AllowCredentials: true,
		MaxAge:           86400, // 24 hours
	})
}

// FileUploadSecurityMiddleware adds specific security for file upload endpoints
func FileUploadSecurityMiddleware() echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			// Additional security headers for file uploads
			c.Response().Header().Set("X-Content-Type-Options", "nosniff")
			c.Response().Header().Set("X-Frame-Options", "DENY")

			// Prevent MIME type sniffing for uploads
			c.Response().Header().Set("X-Download-Options", "noopen")

			// Set upload-specific CSP
			c.Response().Header().Set("Content-Security-Policy",
				"default-src 'self'; "+
					"script-src 'self'; "+
					"object-src 'none'; "+
					"base-uri 'self'; "+
					"frame-ancestors 'none'")

			return next(c)
		}
	}
}

// RequestSizeLimit limits the size of incoming requests
func RequestSizeLimit(maxSize string) echo.MiddlewareFunc {
	return middleware.BodyLimit(maxSize)
}

// SecureHeaders applies all security headers at once
func SecureHeaders() echo.MiddlewareFunc {
	return echo.WrapMiddleware(func(h http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Security headers
			w.Header().Set("X-Content-Type-Options", "nosniff")
			w.Header().Set("X-Frame-Options", "DENY")
			w.Header().Set("X-XSS-Protection", "1; mode=block")
			w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")
			w.Header().Set("X-Permitted-Cross-Domain-Policies", "none")

			// Content Security Policy
			w.Header().Set("Content-Security-Policy", "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'")

			// Prevent clickjacking
			w.Header().Set("X-Frame-Options", "DENY")

			// Prevent MIME type sniffing
			w.Header().Set("X-Content-Type-Options", "nosniff")

			// Enable XSS protection
			w.Header().Set("X-XSS-Protection", "1; mode=block")

			h.ServeHTTP(w, r)
		})
	})
}