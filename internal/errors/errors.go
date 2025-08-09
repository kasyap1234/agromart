package errors

import (
	"fmt"
	"net/http"
)

// CustomError represents a custom application error
type CustomError struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
	Err     error  `json:"-"`
}

func (e *CustomError) Error() string {
	return e.Message
}

// Unwrap returns the underlying error
func (e *CustomError) Unwrap() error {
	return e.Err
}

// HTTPStatus returns the HTTP status code
func (e *CustomError) HTTPStatus() int {
	return e.Code
}

// Common error constructors
func NewBadRequest(message string) *CustomError {
	return &CustomError{
		Code:    http.StatusBadRequest,
		Message: message,
	}
}

func NewUnauthorized(message string) *CustomError {
	return &CustomError{
		Code:    http.StatusUnauthorized,
		Message: message,
	}
}

func NewForbidden(message string) *CustomError {
	return &CustomError{
		Code:    http.StatusForbidden,
		Message: message,
	}
}

func NewNotFound(message string) *CustomError {
	return &CustomError{
		Code:    http.StatusNotFound,
		Message: message,
	}
}

func NewInternalServerError(message string) *CustomError {
	return &CustomError{
		Code:    http.StatusInternalServerError,
		Message: message,
	}
}

func NewConflict(message string) *CustomError {
	return &CustomError{
		Code:    http.StatusConflict,
		Message: message,
	}
}

func NewUnprocessableEntity(message string) *CustomError {
	return &CustomError{
		Code:    http.StatusUnprocessableEntity,
		Message: message,
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