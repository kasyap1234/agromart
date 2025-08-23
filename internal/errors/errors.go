package errors

import (
	"fmt"
	"net/http"
	"time"
)

// ErrorContext provides additional context for errors
type ErrorContext struct {
	RequestID   string                 `json:"request_id,omitempty"`
	UserID      string                 `json:"user_id,omitempty"`
	TenantID    string                 `json:"tenant_id,omitempty"`
	Component   string                 `json:"component,omitempty"`
	Action      string                 `json:"action,omitempty"`
	Method      string                 `json:"method,omitempty"`
	Path        string                 `json:"path,omitempty"`
	IPAddress   string                 `json:"ip_address,omitempty"`
	UserAgent   string                 `json:"user_agent,omitempty"`
	Timestamp   time.Time              `json:"timestamp"`
	Duration    time.Duration          `json:"duration,omitempty"`
	Metadata    map[string]interface{} `json:"metadata,omitempty"`
	StackTrace  []string               `json:"stack_trace,omitempty"`
}

// CustomError represents a custom application error with enhanced context
type CustomError struct {
	Code      int             `json:"code"`
	Message   string          `json:"message"`
	Type      string          `json:"type"`
	Severity  string          `json:"severity"` // "low", "medium", "high", "critical"
	Category  string          `json:"category"` // "validation", "auth", "business", "system", "network"
	Err       error           `json:"-"`
	Context   *ErrorContext   `json:"context,omitempty"`
	Retryable bool            `json:"retryable"`
	HelpURL   string          `json:"help_url,omitempty"`
}

func (e *CustomError) Error() string {
	if e.Context != nil && e.Context.RequestID != "" {
		return fmt.Sprintf("[%s] %s: %s", e.Context.RequestID, e.Type, e.Message)
	}
	return fmt.Sprintf("%s: %s", e.Type, e.Message)
}

// Unwrap returns the underlying error
func (e *CustomError) Unwrap() error {
	return e.Err
}

// HTTPStatus returns the HTTP status code
func (e *CustomError) HTTPStatus() int {
	return e.Code
}

// WithContext adds context to the error
func (e *CustomError) WithContext(ctx *ErrorContext) *CustomError {
	e.Context = ctx
	return e
}

// WithMetadata adds metadata to the error context
func (e *CustomError) WithMetadata(key string, value interface{}) *CustomError {
	if e.Context == nil {
		e.Context = &ErrorContext{}
	}
	if e.Context.Metadata == nil {
		e.Context.Metadata = make(map[string]interface{})
	}
	e.Context.Metadata[key] = value
	return e
}

// Common error constructors with enhanced context
func NewBadRequest(message string) *CustomError {
	return &CustomError{
		Code:      http.StatusBadRequest,
		Message:   message,
		Type:      "BAD_REQUEST",
		Severity:  "low",
		Category:  "validation",
		Retryable: false,
	}
}

func NewUnauthorized(message string) *CustomError {
	return &CustomError{
		Code:      http.StatusUnauthorized,
		Message:   message,
		Type:      "UNAUTHORIZED",
		Severity:  "medium",
		Category:  "auth",
		Retryable: false,
		HelpURL:   "/help/authentication",
	}
}

func NewForbidden(message string) *CustomError {
	return &CustomError{
		Code:      http.StatusForbidden,
		Message:   message,
		Type:      "FORBIDDEN",
		Severity:  "medium",
		Category:  "auth",
		Retryable: false,
		HelpURL:   "/help/permissions",
	}
}

func NewNotFound(message string) *CustomError {
	return &CustomError{
		Code:      http.StatusNotFound,
		Message:   message,
		Type:      "NOT_FOUND",
		Severity:  "low",
		Category:  "business",
		Retryable: false,
	}
}

func NewInternalServerError(message string) *CustomError {
	return &CustomError{
		Code:      http.StatusInternalServerError,
		Message:   message,
		Type:      "INTERNAL_SERVER_ERROR",
		Severity:  "high",
		Category:  "system",
		Retryable: true,
		HelpURL:   "/help/technical-issues",
	}
}

func NewConflict(message string) *CustomError {
	return &CustomError{
		Code:      http.StatusConflict,
		Message:   message,
		Type:      "CONFLICT",
		Severity:  "low",
		Category:  "business",
		Retryable: false,
	}
}

func NewUnprocessableEntity(message string) *CustomError {
	return &CustomError{
		Code:      http.StatusUnprocessableEntity,
		Message:   message,
		Type:      "VALIDATION_ERROR",
		Severity:  "low",
		Category:  "validation",
		Retryable: false,
	}
}

// Network-related errors
func NewTimeoutError(message string, cause error) *CustomError {
	return &CustomError{
		Code:      http.StatusRequestTimeout,
		Message:   message,
		Type:      "TIMEOUT_ERROR",
		Severity:  "medium",
		Category:  "network",
		Retryable: true,
		Err:       cause,
		HelpURL:   "/help/network-issues",
	}
}

func NewServiceUnavailableError(message string, cause error) *CustomError {
	return &CustomError{
		Code:      http.StatusServiceUnavailable,
		Message:   message,
		Type:      "SERVICE_UNAVAILABLE",
		Severity:  "high",
		Category:  "system",
		Retryable: true,
		Err:       cause,
		HelpURL:   "/help/service-maintenance",
	}
}

func NewTooManyRequestsError(message string, cause error) *CustomError {
	return &CustomError{
		Code:      http.StatusTooManyRequests,
		Message:   message,
		Type:      "RATE_LIMIT_ERROR",
		Severity:  "medium",
		Category:  "system",
		Retryable: true,
		Err:       cause,
		HelpURL:   "/help/rate-limits",
	}
}

// Database errors
func NewDatabaseError(message string, cause error) *CustomError {
	return &CustomError{
		Code:      http.StatusInternalServerError,
		Message:   "Database operation failed",
		Type:      "DATABASE_ERROR",
		Severity:  "high",
		Category:  "system",
		Retryable: true,
		Err:       cause,
	}
}

func NewConnectionError(message string, cause error) *CustomError {
	return &CustomError{
		Code:      http.StatusServiceUnavailable,
		Message:   "Connection failed",
		Type:      "CONNECTION_ERROR",
		Severity:  "high",
		Category:  "network",
		Retryable: true,
		Err:       cause,
	}
}

// Wrap wraps an error with a custom error
func Wrap(err error, code int, message string) *CustomError {
	return &CustomError{
		Code:    code,
		Message: message,
		Err:     err,
	}
}

// Wrapf wraps an error with a custom error and formatted message
func Wrapf(err error, code int, format string, args ...interface{}) *CustomError {
	return &CustomError{
		Code:    code,
		Message: fmt.Sprintf(format, args...),
		Err:     err,
	}
}