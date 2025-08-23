package middleware

import (
	"html"
	"mime/multipart"
	"net/url"
	"regexp"
	"strings"

	"github.com/labstack/echo/v4"
	"github.com/rs/zerolog/log"
)

// ValidationConfig holds validation middleware configuration
type ValidationConfig struct {
	EnableSQLInjectionProtection bool
	EnableXSSProtection         bool
	EnableInputSanitization     bool
	MaxFieldLength              int
	MaxArraySize                int
	AllowedFileTypes            []string
	MaxFileSize                 int64
}

// DefaultValidationConfig returns a secure default configuration
func DefaultValidationConfig() *ValidationConfig {
	return &ValidationConfig{
		EnableSQLInjectionProtection: true,
		EnableXSSProtection:         true,
		EnableInputSanitization:     true,
		MaxFieldLength:              10000,
		MaxArraySize:                100,
		AllowedFileTypes:            []string{"jpg", "jpeg", "png", "gif", "pdf", "doc", "docx"},
		MaxFileSize:                 10 << 20, // 10MB
	}
}

// ValidationMiddleware provides input validation and sanitization
type ValidationMiddleware struct {
	config   *ValidationConfig
	sqlRegex *regexp.Regexp
	xssRegex *regexp.Regexp
}

// NewValidationMiddleware creates a new validation middleware instance
func NewValidationMiddleware(config *ValidationConfig) *ValidationMiddleware {
	if config == nil {
		config = DefaultValidationConfig()
	}

	// SQL injection detection patterns
	sqlPatterns := []string{
		`(?i)\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE|EXEC|EXECUTE|DECLARE|CAST|CONVERT)\b.*\b(FROM|INTO|VALUES|SET|WHERE|TABLE|DATABASE|INDEX|VIEW)\b`,
		`(?i)['";\\-].*(\bOR\b|\bAND\b).*['";\\-]`,
		`(?i)\bUNION\b.*\bSELECT\b`,
		`(?i)\bEXEC\b.*\bSP_|XP_\w+\b`,
		`(?i)--.*$`,
		`(?i)/\*.*?\*/`,
		`(?i)\bWAITFOR\b.*\bDELAY\b`,
		`(?i)\bSHUTDOWN\b.*\bWITH\b.*\bNOWAIT\b`,
	}

	sqlRegexPattern := strings.Join(sqlPatterns, "|")
	sqlRegex, _ := regexp.Compile(sqlRegexPattern)

	// XSS detection patterns
	xssPatterns := []string{
		`(?i)<script[^>]*>.*?</script>`,
		`(?i)javascript:`,
		`(?i)on\w+\s*=`,
		`(?i)<iframe[^>]*>.*?</iframe>`,
		`(?i)<object[^>]*>.*?</object>`,
		`(?i)<embed[^>]*>.*?</embed>`,
		`(?i)eval\s*\(`,
		`(?i)alert\s*\(`,
		`(?i)document\.cookie`,
		`(?i)document\.write`,
	}

	xssRegexPattern := strings.Join(xssPatterns, "|")
	xssRegex, _ := regexp.Compile(xssRegexPattern)

	return &ValidationMiddleware{
		config:   config,
		sqlRegex: sqlRegex,
		xssRegex: xssRegex,
	}
}

// InputValidation middleware validates and sanitizes input data
func (vm *ValidationMiddleware) InputValidation() echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			// Sanitize form data
			if err := vm.sanitizeFormData(c); err != nil {
				log.Warn().
					Err(err).
					Str("ip", c.RealIP()).
					Str("path", c.Request().URL.Path).
					Msg("Form data validation failed")
				return echo.NewHTTPError(400, "Invalid input data")
			}

			// Validate query parameters
			if err := vm.validateQueryParams(c); err != nil {
				log.Warn().
					Err(err).
					Str("ip", c.RealIP()).
					Str("path", c.Request().URL.Path).
					Msg("Query parameter validation failed")
				return echo.NewHTTPError(400, "Invalid query parameters")
			}

			// Check for SQL injection
			if vm.config.EnableSQLInjectionProtection {
				if err := vm.detectSQLInjection(c); err != nil {
					log.Warn().
						Err(err).
						Str("ip", c.RealIP()).
						Str("path", c.Request().URL.Path).
						Msg("SQL injection detected")
					return echo.NewHTTPError(403, "Suspicious request detected")
				}
			}

			return next(c)
		}
	}
}

// XSSProtection middleware prevents XSS attacks
func (vm *ValidationMiddleware) XSSProtection() echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			if !vm.config.EnableXSSProtection {
				return next(c)
			}

			// Sanitize request body for XSS
			if err := vm.sanitizeRequestBody(c); err != nil {
				log.Warn().
					Err(err).
					Str("ip", c.RealIP()).
					Str("path", c.Request().URL.Path).
					Msg("XSS protection triggered")
				return echo.NewHTTPError(400, "Invalid input data")
			}

			return next(c)
		}
	}
}

// FileUploadValidation middleware validates uploaded files
func (vm *ValidationMiddleware) FileUploadValidation() echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			// Check if this is a multipart form
			if !strings.Contains(c.Request().Header.Get("Content-Type"), "multipart/form-data") {
				return next(c)
			}

			// Parse multipart form
			form, err := c.MultipartForm()
			if err != nil {
				return echo.NewHTTPError(400, "Invalid form data")
			}

			// Validate files
			for _, files := range form.File {
				for _, fileHeader := range files {
					// Check file size
					if fileHeader.Size > vm.config.MaxFileSize {
						log.Warn().
							Str("filename", fileHeader.Filename).
							Int64("size", fileHeader.Size).
							Int64("max_size", vm.config.MaxFileSize).
							Msg("File too large")
						return echo.NewHTTPError(413, "File too large")
					}

					// Check file type
					if !vm.isAllowedFileType(fileHeader.Filename) {
						log.Warn().
							Str("filename", fileHeader.Filename).
							Msg("File type not allowed")
						return echo.NewHTTPError(400, "File type not allowed")
					}

					// Additional security checks
					if err := vm.validateFileContent(fileHeader); err != nil {
						log.Warn().
							Err(err).
							Str("filename", fileHeader.Filename).
							Msg("File content validation failed")
						return echo.NewHTTPError(400, "Invalid file content")
					}
				}
			}

			return next(c)
		}
	}
}

// sanitizeFormData sanitizes form input data
func (vm *ValidationMiddleware) sanitizeFormData(c echo.Context) error {
	if err := c.Request().ParseForm(); err != nil {
		return err
	}

	for key, values := range c.Request().Form {
		for i, value := range values {
			// Check field length
			if len(value) > vm.config.MaxFieldLength {
				return echo.NewHTTPError(400, "Field too long: "+key)
			}

			// Sanitize value
			if vm.config.EnableInputSanitization {
				values[i] = vm.sanitizeInput(value)
			}
		}
	}

	return nil
}

// validateQueryParams validates query parameters
func (vm *ValidationMiddleware) validateQueryParams(c echo.Context) error {
	for key, values := range c.Request().URL.Query() {
		for _, value := range values {
			// Check parameter length
			if len(value) > vm.config.MaxFieldLength {
				return echo.NewHTTPError(400, "Query parameter too long: "+key)
			}

			// Validate URL encoding
			if _, err := url.QueryUnescape(value); err != nil {
				return echo.NewHTTPError(400, "Invalid query parameter encoding: "+key)
			}
		}
	}
	return nil
}

// detectSQLInjection detects SQL injection attempts
func (vm *ValidationMiddleware) detectSQLInjection(c echo.Context) error {
	// Check form data
	for key, values := range c.Request().Form {
		for _, value := range values {
			if vm.sqlRegex.MatchString(value) {
				log.Warn().
					Str("field", key).
					Str("value", value).
					Msg("SQL injection pattern detected in form data")
				return echo.NewHTTPError(403, "Suspicious input detected")
			}
		}
	}

	// Check query parameters
	for key, values := range c.Request().URL.Query() {
		for _, value := range values {
			if vm.sqlRegex.MatchString(value) {
				log.Warn().
					Str("param", key).
					Str("value", value).
					Msg("SQL injection pattern detected in query parameters")
				return echo.NewHTTPError(403, "Suspicious input detected")
			}
		}
	}

	return nil
}

// sanitizeRequestBody sanitizes request body content
func (vm *ValidationMiddleware) sanitizeRequestBody(c echo.Context) error {
	// This would need to be implemented based on your JSON parsing logic
	// For now, we'll focus on form data sanitization
	return nil
}

// sanitizeInput sanitizes a single input string
func (vm *ValidationMiddleware) sanitizeInput(input string) string {
	// HTML escape
	sanitized := html.EscapeString(input)

	// Remove null bytes
	sanitized = strings.ReplaceAll(sanitized, "\x00", "")

	// Remove control characters except newlines and tabs
	sanitized = regexp.MustCompile(`[\x01-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]`).ReplaceAllString(sanitized, "")

	// Additional XSS protection using regex patterns
	if vm.xssRegex.MatchString(sanitized) {
		log.Warn().Str("input", input).Msg("XSS pattern detected and sanitized")
		// Remove common XSS patterns
		sanitized = vm.xssRegex.ReplaceAllString(sanitized, "[BLOCKED]")
	}

	return sanitized
}

// isAllowedFileType checks if file type is allowed
func (vm *ValidationMiddleware) isAllowedFileType(filename string) bool {
	parts := strings.Split(strings.ToLower(filename), ".")
	if len(parts) < 2 {
		return false
	}

	extension := parts[len(parts)-1]
	for _, allowedType := range vm.config.AllowedFileTypes {
		if extension == allowedType {
			return true
		}
	}

	return false
}

// validateFileContent performs additional file content validation
func (vm *ValidationMiddleware) validateFileContent(fileHeader *multipart.FileHeader) error {
	// This would implement file content analysis
	// For now, we'll just check the filename for suspicious patterns
	filename := strings.ToLower(fileHeader.Filename)

	suspiciousPatterns := []string{
		"../",
		"..\\",
		"<script",
		"javascript:",
		"onload=",
		"onerror=",
		"eval(",
		"alert(",
	}

	for _, pattern := range suspiciousPatterns {
		if strings.Contains(filename, pattern) {
			return echo.NewHTTPError(400, "Suspicious filename detected")
		}
	}

	return nil
}

// GetValidationMetrics returns validation metrics for monitoring
func (vm *ValidationMiddleware) GetValidationMetrics() map[string]interface{} {
	return map[string]interface{}{
		"sql_injection_protection": vm.config.EnableSQLInjectionProtection,
		"xss_protection":          vm.config.EnableXSSProtection,
		"input_sanitization":      vm.config.EnableInputSanitization,
		"max_field_length":        vm.config.MaxFieldLength,
		"max_array_size":          vm.config.MaxArraySize,
		"max_file_size_mb":        vm.config.MaxFileSize / (1024 * 1024),
		"allowed_file_types":      vm.config.AllowedFileTypes,
	}
}