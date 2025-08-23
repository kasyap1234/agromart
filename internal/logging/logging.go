package logging

import (
	"context"
	"os"
	"time"

	"github.com/rs/zerolog"
)

// Logger represents our application logger
type Logger struct {
	logger zerolog.Logger
}

// NewLogger creates a new logger instance
func NewLogger(serviceName string, environment string) *Logger {
	// Configure zerolog
	output := zerolog.ConsoleWriter{Out: os.Stdout, TimeFormat: time.RFC3339}

	// Create logger with console output
	logger := zerolog.New(output).With().
		Str("service", serviceName).
		Str("environment", environment).
		Timestamp().
		Logger()

	// Set log level based on environment
	switch environment {
	case "production":
		logger = logger.Level(zerolog.InfoLevel)
	case "development":
		logger = logger.Level(zerolog.DebugLevel)
	case "test":
		logger = logger.Level(zerolog.ErrorLevel)
	default:
		logger = logger.Level(zerolog.InfoLevel)
	}

	return &Logger{logger: logger}
}

// WithContext returns a logger with context fields
func (l *Logger) WithContext(ctx context.Context) *Logger {
	return &Logger{
		logger: l.logger.With().Logger(),
	}
}

// WithFields returns a logger with additional fields
func (l *Logger) WithFields(fields map[string]interface{}) *Logger {
	return &Logger{
		logger: l.logger.With().Fields(fields).Logger(),
	}
}

// Debug logs a debug message
func (l *Logger) Debug(msg string) {
	l.logger.Debug().Msg(msg)
}

// Info logs an info message
func (l *Logger) Info(msg string) {
	l.logger.Info().Msg(msg)
}

// Warn logs a warning message
func (l *Logger) Warn(msg string) {
	l.logger.Warn().Msg(msg)
}

// Error logs an error message
func (l *Logger) Error(msg string) {
	l.logger.Error().Msg(msg)
}

// ErrorWithErr logs an error with an error object
func (l *Logger) ErrorWithErr(msg string, err error) {
	l.logger.Error().Err(err).Msg(msg)
}


// Fatal logs a fatal message and exits
func (l *Logger) Fatal(msg string) {
	l.logger.Fatal().Msg(msg)
}

// FatalWithErr logs a fatal message with an error object and exits
func (l *Logger) FatalWithErr(msg string, err error) {
	l.logger.Fatal().Err(err).Msg(msg)
}

// WithRequestID adds request ID to log context
func (l *Logger) WithRequestID(requestID string) *Logger {
	return l.WithFields(map[string]interface{}{
		"request_id": requestID,
	})
}

// WithUserID adds user ID to log context
func (l *Logger) WithUserID(userID string) *Logger {
	return l.WithFields(map[string]interface{}{
		"user_id": userID,
	})
}

// WithTenantID adds tenant ID to log context
func (l *Logger) WithTenantID(tenantID string) *Logger {
	return l.WithFields(map[string]interface{}{
		"tenant_id": tenantID,
	})
}

// WithAction adds action to log context
func (l *Logger) WithAction(action string) *Logger {
	return l.WithFields(map[string]interface{}{
		"action": action,
	})
}

// WithResource adds resource to log context
func (l *Logger) WithResource(resource string) *Logger {
	return l.WithFields(map[string]interface{}{
		"resource": resource,
	})
}

// WithDuration adds duration to log context
func (l *Logger) WithDuration(duration time.Duration) *Logger {
	return l.WithFields(map[string]interface{}{
		"duration_ms": duration.Milliseconds(),
	})
}

// WithStatus adds status to log context
func (l *Logger) WithStatus(status string) *Logger {
	return l.WithFields(map[string]interface{}{
		"status": status,
	})
}

// WithIP adds IP address to log context
func (l *Logger) WithIP(ip string) *Logger {
	return l.WithFields(map[string]interface{}{
		"ip": ip,
	})
}

// WithUserAgent adds user agent to log context
func (l *Logger) WithUserAgent(userAgent string) *Logger {
	return l.WithFields(map[string]interface{}{
		"user_agent": userAgent,
	})
}

// WithMethod adds HTTP method to log context
func (l *Logger) WithMethod(method string) *Logger {
	return l.WithFields(map[string]interface{}{
		"method": method,
	})
}

// WithPath adds path to log context
func (l *Logger) WithPath(path string) *Logger {
	return l.WithFields(map[string]interface{}{
		"path": path,
	})
}

// WithStatusCode adds HTTP status code to log context
func (l *Logger) WithStatusCode(statusCode int) *Logger {
	return l.WithFields(map[string]interface{}{
		"status_code": statusCode,
	})
}

// WithError adds error to log context
func (l *Logger) WithError(err error) *Logger {
	return l.WithFields(map[string]interface{}{
		"error": err.Error(),
	})
}

// LogRequest logs HTTP request information
func (l *Logger) LogRequest(method, path, ip, userAgent string, statusCode int, duration time.Duration) {
	l.WithMethod(method).
		WithPath(path).
		WithIP(ip).
		WithUserAgent(userAgent).
		WithStatusCode(statusCode).
		WithDuration(duration).
		Info("HTTP request")
}

// LogDatabaseOperation logs database operation
func (l *Logger) LogDatabaseOperation(operation, table string, duration time.Duration, err error) {
	fields := map[string]interface{}{
		"operation": operation,
		"table":     table,
		"duration_ms": duration.Milliseconds(),
	}

	if err != nil {
		fields["error"] = err.Error()
		l.WithFields(fields).Error("Database operation failed")
	} else {
		l.WithFields(fields).Info("Database operation completed")
	}
}

// LogAuthentication logs authentication events
func (l *Logger) LogAuthentication(action, email, userID, tenantID string, success bool, err error) {
	fields := map[string]interface{}{
		"action":    action,
		"email":     email,
		"user_id":   userID,
		"tenant_id": tenantID,
		"success":   success,
	}

	if err != nil {
		fields["error"] = err.Error()
		l.WithFields(fields).Error("Authentication event")
	} else {
		l.WithFields(fields).Info("Authentication event")
	}
}

// LogBusinessEvent logs business events
func (l *Logger) LogBusinessEvent(eventType, description string, userID, tenantID string, metadata map[string]interface{}) {
	fields := map[string]interface{}{
		"event_type":   eventType,
		"description":  description,
		"user_id":      userID,
		"tenant_id":    tenantID,
	}

	for key, value := range metadata {
		fields[key] = value
	}

	l.WithFields(fields).Info("Business event")
}

// LogSecurityEvent logs security-related events
func (l *Logger) LogSecurityEvent(eventType, description string, userID, tenantID, ip string, metadata map[string]interface{}) {
	fields := map[string]interface{}{
		"event_type":   eventType,
		"description":  description,
		"user_id":      userID,
		"tenant_id":    tenantID,
		"ip":           ip,
	}

	for key, value := range metadata {
		fields[key] = value
	}

	l.WithFields(fields).Warn("Security event")
}

// LogSystemEvent logs system events
func (l *Logger) LogSystemEvent(eventType, description string, metadata map[string]interface{}) {
	fields := map[string]interface{}{
		"event_type":   eventType,
		"description":  description,
	}

	for key, value := range metadata {
		fields[key] = value
	}

	l.WithFields(fields).Info("System event")
}

// GetLogger returns the underlying zerolog logger
func (l *Logger) GetLogger() *zerolog.Logger {
	return &l.logger
}

// ContextWithLogger adds logger to context
func ContextWithLogger(ctx context.Context, logger *Logger) context.Context {
	return logger.GetLogger().WithContext(ctx)
}

// LoggerFromContext extracts logger from context
func LoggerFromContext(ctx context.Context) *Logger {
	logger := zerolog.Ctx(ctx)
	return &Logger{logger: *logger}
}
