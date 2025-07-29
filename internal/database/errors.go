package database

import (
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

// Common database error types
var (
	ErrNotFound         = errors.New("record not found")
	ErrDuplicateKey     = errors.New("duplicate key violation")
	ErrForeignKey       = errors.New("foreign key violation")
	ErrCheckConstraint  = errors.New("check constraint violation")
	ErrNotNullViolation = errors.New("not null constraint violation")
	ErrConnectionFailed = errors.New("database connection failed")
	ErrTransactionFailed = errors.New("transaction failed")
)

// ErrorCode represents PostgreSQL error codes
type ErrorCode string

const (
	ErrorCodeUniqueViolation     ErrorCode = "23505"
	ErrorCodeForeignKeyViolation ErrorCode = "23503"
	ErrorCodeCheckViolation      ErrorCode = "23514"
	ErrorCodeNotNullViolation    ErrorCode = "23502"
	ErrorCodeInvalidTextRep      ErrorCode = "22P02"
	ErrorCodeDeadlock            ErrorCode = "40P01"
	ErrorCodeSerializationFailure ErrorCode = "40001"
)

// DatabaseError wraps database errors with additional context
type DatabaseError struct {
	Code    ErrorCode
	Message string
	Detail  string
	Hint    string
	Err     error
}

func (e *DatabaseError) Error() string {
	if e.Detail != "" {
		return fmt.Sprintf("%s: %s (detail: %s)", e.Message, e.Err.Error(), e.Detail)
	}
	return fmt.Sprintf("%s: %s", e.Message, e.Err.Error())
}

func (e *DatabaseError) Unwrap() error {
	return e.Err
}

// IsNotFound checks if the error is a "not found" error
func IsNotFound(err error) bool {
	return errors.Is(err, pgx.ErrNoRows) || errors.Is(err, ErrNotFound)
}

// IsDuplicateKey checks if the error is a duplicate key violation
func IsDuplicateKey(err error) bool {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		return pgErr.Code == string(ErrorCodeUniqueViolation)
	}
	return errors.Is(err, ErrDuplicateKey)
}

// IsForeignKeyViolation checks if the error is a foreign key violation
func IsForeignKeyViolation(err error) bool {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		return pgErr.Code == string(ErrorCodeForeignKeyViolation)
	}
	return errors.Is(err, ErrForeignKey)
}

// IsConstraintViolation checks if the error is any constraint violation
func IsConstraintViolation(err error) bool {
	return IsDuplicateKey(err) || IsForeignKeyViolation(err) || IsCheckConstraintViolation(err) || IsNotNullViolation(err)
}

// IsCheckConstraintViolation checks if the error is a check constraint violation
func IsCheckConstraintViolation(err error) bool {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		return pgErr.Code == string(ErrorCodeCheckViolation)
	}
	return errors.Is(err, ErrCheckConstraint)
}

// IsNotNullViolation checks if the error is a not null constraint violation
func IsNotNullViolation(err error) bool {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		return pgErr.Code == string(ErrorCodeNotNullViolation)
	}
	return errors.Is(err, ErrNotNullViolation)
}

// IsDeadlock checks if the error is a deadlock
func IsDeadlock(err error) bool {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		return pgErr.Code == string(ErrorCodeDeadlock)
	}
	return false
}

// IsSerializationFailure checks if the error is a serialization failure
func IsSerializationFailure(err error) bool {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		return pgErr.Code == string(ErrorCodeSerializationFailure)
	}
	return false
}

// WrapError wraps a database error with additional context
func WrapError(err error, message string) error {
	if err == nil {
		return nil
	}

	// Handle pgx.ErrNoRows specially
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrNotFound
	}

	// Handle PostgreSQL errors
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		return &DatabaseError{
			Code:    ErrorCode(pgErr.Code),
			Message: message,
			Detail:  pgErr.Detail,
			Hint:    pgErr.Hint,
			Err:     err,
		}
	}

	return fmt.Errorf("%s: %w", message, err)
}

// ParseConstraintName extracts the constraint name from a PostgreSQL error
func ParseConstraintName(err error) string {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		return pgErr.ConstraintName
	}
	return ""
}

// IsRetriableError checks if an error is retriable (deadlock, serialization failure, etc.)
func IsRetriableError(err error) bool {
	return IsDeadlock(err) || IsSerializationFailure(err)
}
