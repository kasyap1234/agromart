package errors

import (
	"fmt"
	"net/http"
)

// ErrorType represents the type of error
type ErrorType int

const (
	// Validation errors
	ValidationError ErrorType = iota
	// Authentication errors
	UnauthorizedError
	ForbiddenError
	// Not found errors
	NotFoundError
	// Conflict errors
	ConflictError
	// Database errors
	DatabaseError
	// Business logic errors
	BusinessLogicError
	// System errors
	SystemError
)

// AppError represents a custom application error
type AppError struct {
	Type    ErrorType
	Message string
	Details string
	Code    int
	Cause   error
}

// Error implements the error interface
func (e *AppError) Error() string {
	if e.Cause != nil {
		return fmt.Sprintf("%s: %s (cause: %v)", e.Message, e.Details, e.Cause)
	}
	return fmt.Sprintf("%s: %s", e.Message, e.Details)
}

// Unwrap returns the underlying error for unwrapping
func (e *AppError) Unwrap() error {
	return e.Cause
}

// NewValidationError creates a new validation error
func NewValidationError(message, details string) *AppError {
	return &AppError{
		Type:    ValidationError,
		Message: message,
		Details: details,
		Code:    http.StatusBadRequest,
	}
}

// NewUnauthorizedError creates a new unauthorized error
func NewUnauthorizedError(message, details string) *AppError {
	return &AppError{
		Type:    UnauthorizedError,
		Message: message,
		Details: details,
		Code:    http.StatusUnauthorized,
	}
}

// NewForbiddenError creates a new forbidden error
func NewForbiddenError(message, details string) *AppError {
	return &AppError{
		Type:    ForbiddenError,
		Message: message,
		Details: details,
		Code:    http.StatusForbidden,
	}
}

// NewNotFoundError creates a new not found error
func NewNotFoundError(message, details string) *AppError {
	return &AppError{
		Type:    NotFoundError,
		Message: message,
		Details: details,
		Code:    http.StatusNotFound,
	}
}

// NewConflictError creates a new conflict error
func NewConflictError(message, details string) *AppError {
	return &AppError{
		Type:    ConflictError,
		Message: message,
		Details: details,
		Code:    http.StatusConflict,
	}
}

// NewDatabaseError creates a new database error
func NewDatabaseError(message, details string, cause error) *AppError {
	return &AppError{
		Type:    DatabaseError,
		Message: message,
		Details: details,
		Code:    http.StatusInternalServerError,
		Cause:   cause,
	}
}

// NewBusinessLogicError creates a new business logic error
func NewBusinessLogicError(message, details string) *AppError {
	return &AppError{
		Type:    BusinessLogicError,
		Message: message,
		Details: details,
		Code:    http.StatusUnprocessableEntity,
	}
}

// NewSystemError creates a new system error
func NewSystemError(message, details string, cause error) *AppError {
	return &AppError{
		Type:    SystemError,
		Message: message,
		Details: details,
		Code:    http.StatusInternalServerError,
		Cause:   cause,
	}
}

// WrapError wraps an existing error with additional context
func WrapError(err error, message, details string) *AppError {
	if appErr, ok := err.(*AppError); ok {
		appErr.Details = details
		appErr.Message = message
		return appErr
	}
	return NewSystemError(message, details, err)
}

// IsErrorType checks if an error is of a specific type
func IsErrorType(err error, errorType ErrorType) bool {
	if appErr, ok := err.(*AppError); ok {
		return appErr.Type == errorType
	}
	return false
}

// HTTPError represents an HTTP error response
type HTTPError struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
	Details string `json:"details,omitempty"`
}

// ToHTTPError converts an AppError to an HTTPError
func (e *AppError) ToHTTPError() HTTPError {
	return HTTPError{
		Code:    e.Code,
		Message: e.Message,
		Details: e.Details,
	}
}