package validation

import (
	"errors"
	"fmt"
	"reflect"
	"regexp"
	"strconv"
	"strings"

	"github.com/go-playground/validator/v10"
)

var validate *validator.Validate

func init() {
	validate = validator.New()
}

// ValidationError represents a validation error
type ValidationError struct {
	Field   string `json:"field"`
	Message string `json:"message"`
}

// ValidationErrors represents a collection of validation errors
type ValidationErrors []ValidationError

func (ve ValidationErrors) Error() string {
	var sb strings.Builder
	for _, err := range ve {
		sb.WriteString(fmt.Sprintf("%s: %s; ", err.Field, err.Message))
	}
	return strings.TrimSuffix(sb.String(), "; ")
}

// Validate validates a struct using validator tags
func Validate(s interface{}) error {
	if err := validate.Struct(s); err != nil {
		var validationErrors ValidationErrors
		for _, err := range err.(validator.ValidationErrors) {
			validationErrors = append(validationErrors, ValidationError{
				Field:   err.Field(),
				Message: getValidationMessage(err),
			})
		}
		return validationErrors
	}
	return nil
}

// getValidationMessage returns a user-friendly validation message
func getValidationMessage(err validator.FieldError) string {
	switch err.Tag() {
	case "required":
		return "is required"
	case "email":
		return "must be a valid email address"
	case "min":
		if err.Kind() == reflect.String {
			return fmt.Sprintf("must be at least %s characters long", err.Param())
		}
		return fmt.Sprintf("must be at least %s", err.Param())
	case "max":
		if err.Kind() == reflect.String {
			return fmt.Sprintf("must be at most %s characters long", err.Param())
		}
		return fmt.Sprintf("must be at most %s", err.Param())
	case "len":
		if err.Kind() == reflect.String {
			return fmt.Sprintf("must be exactly %s characters long", err.Param())
		}
		return fmt.Sprintf("must be exactly %s", err.Param())
	case "oneof":
		return fmt.Sprintf("must be one of: %s", err.Param())
	case "uuid":
		return "must be a valid UUID"
	case "numeric":
		return "must be a valid number"
	default:
		return "is invalid"
	}
}

// ValidateEmail validates an email address
func ValidateEmail(email string) error {
	emailRegex := regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)
	if !emailRegex.MatchString(email) {
		return errors.New("invalid email format")
	}
	return nil
}

// ValidatePassword validates a password
func ValidatePassword(password string) error {
	if len(password) < 8 {
		return errors.New("password must be at least 8 characters long")
	}
	
	var hasUpper, hasLower, hasDigit, hasSpecial bool
	
	for _, char := range password {
		switch {
		case char >= 'A' && char <= 'Z':
			hasUpper = true
		case char >= 'a' && char <= 'z':
			hasLower = true
		case char >= '0' && char <= '9':
			hasDigit = true
		default:
			hasSpecial = true
		}
	}
	
	if !hasUpper {
		return errors.New("password must contain at least one uppercase letter")
	}
	if !hasLower {
		return errors.New("password must contain at least one lowercase letter")
	}
	if !hasDigit {
		return errors.New("password must contain at least one digit")
	}
	if !hasSpecial {
		return errors.New("password must contain at least one special character")
	}
	
	return nil
}

// ValidateSKU validates a SKU (Stock Keeping Unit)
func ValidateSKU(sku string) error {
	if len(sku) < 3 || len(sku) > 50 {
		return errors.New("SKU must be between 3 and 50 characters long")
	}
	
	// SKU should only contain alphanumeric characters, hyphens, and underscores
	skuRegex := regexp.MustCompile(`^[a-zA-Z0-9_-]+$`)
	if !skuRegex.MatchString(sku) {
		return errors.New("SKU can only contain letters, numbers, hyphens, and underscores")
	}
	
	return nil
}

// ValidateQuantity validates a quantity value
func ValidateQuantity(quantity int) error {
	if quantity < 0 {
		return errors.New("quantity cannot be negative")
	}
	if quantity > 1000000 {
		return errors.New("quantity cannot exceed 1,000,000")
	}
	return nil
}

// ValidatePrice validates a price value
func ValidatePrice(price float64) error {
	if price < 0 {
		return errors.New("price cannot be negative")
	}
	if price > 1000000 {
		return errors.New("price cannot exceed 1,000,000")
	}
	return nil
}

// ValidatePhone validates a phone number
func ValidatePhone(phone string) error {
	if phone == "" {
		return nil // Phone is optional
	}
	
	// Remove all non-digit characters
	digitsOnly := regexp.MustCompile(`[0-9]+`).FindString(phone)
	
	if len(digitsOnly) < 10 || len(digitsOnly) > 15 {
		return errors.New("phone number must be between 10 and 15 digits")
	}
	
	return nil
}

// ValidateExpiryDate validates an expiry date
func ValidateExpiryDate(expiryDate string) error {
	if expiryDate == "" {
		return nil // Expiry date is optional for some products
	}
	
	// Simple date validation (YYYY-MM-DD format)
	dateRegex := regexp.MustCompile(`^\d{4}-\d{2}-\d{2}$`)
	if !dateRegex.MatchString(expiryDate) {
		return errors.New("expiry date must be in YYYY-MM-DD format")
	}
	
	return nil
}

// ValidatePagination validates pagination parameters
func ValidatePagination(page, limit int) error {
	if page < 1 {
		return errors.New("page must be greater than 0")
	}
	if limit < 1 || limit > 100 {
		return errors.New("limit must be between 1 and 100")
	}
	return nil
}

// SanitizeString sanitizes a string input
func SanitizeString(input string) string {
	// Remove leading and trailing whitespace
	input = strings.TrimSpace(input)
	
	// Replace multiple spaces with single space
	spaceRegex := regexp.MustCompile(`\s+`)
	input = spaceRegex.ReplaceAllString(input, " ")
	
	return input
}

// SanitizeEmail sanitizes an email address
func SanitizeEmail(email string) string {
	email = strings.TrimSpace(email)
	email = strings.ToLower(email)
	return email
}

// SanitizeNumber sanitizes a number string
func SanitizeNumber(numStr string) (int, error) {
	numStr = strings.TrimSpace(numStr)
	if numStr == "" {
		return 0, errors.New("number is required")
	}
	
	num, err := strconv.Atoi(numStr)
	if err != nil {
		return 0, errors.New("invalid number format")
	}
	
	return num, nil
}

// SanitizeFloat sanitizes a float string
func SanitizeFloat(floatStr string) (float64, error) {
	floatStr = strings.TrimSpace(floatStr)
	if floatStr == "" {
		return 0, errors.New("float is required")
	}
	
	num, err := strconv.ParseFloat(floatStr, 64)
	if err != nil {
		return 0, errors.New("invalid float format")
	}
	
	return num, nil
}