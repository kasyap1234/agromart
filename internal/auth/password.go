package auth

import (
	"fmt"
	"regexp"
	"strings"
	"unicode"

	"github.com/rs/zerolog/log"
)

// PasswordPolicy defines password complexity requirements
type PasswordPolicy struct {
	MinLength          int  `json:"min_length"`
	MaxLength          int  `json:"max_length"`
	RequireUppercase   bool `json:"require_uppercase"`
	RequireLowercase   bool `json:"require_lowercase"`
	RequireNumbers     bool `json:"require_numbers"`
	RequireSpecialChar bool `json:"require_special_char"`
	PreventCommon      bool `json:"prevent_common"`
	PreventUsername    bool `json:"prevent_username"`
}

// DefaultPasswordPolicy returns a secure default password policy
func DefaultPasswordPolicy() *PasswordPolicy {
	return &PasswordPolicy{
		MinLength:          12,
		MaxLength:          128,
		RequireUppercase:   true,
		RequireLowercase:   true,
		RequireNumbers:     true,
		RequireSpecialChar: true,
		PreventCommon:      true,
		PreventUsername:    true,
	}
}

// PasswordValidator validates passwords against policy requirements
type PasswordValidator struct {
	policy *PasswordPolicy
}

// NewPasswordValidator creates a new password validator with the given policy
func NewPasswordValidator(policy *PasswordPolicy) *PasswordValidator {
	if policy == nil {
		policy = DefaultPasswordPolicy()
	}
	return &PasswordValidator{policy: policy}
}

// PasswordValidationError represents a password validation failure
type PasswordValidationError struct {
	Field   string
	Message string
}

func (e PasswordValidationError) Error() string {
	return fmt.Sprintf("password validation failed: %s", e.Message)
}

// ValidatePassword validates a password against the policy
func (pv *PasswordValidator) ValidatePassword(password, username string) error {
	// Check minimum length
	if len(password) < pv.policy.MinLength {
		return PasswordValidationError{
			Field:   "password",
			Message: fmt.Sprintf("password must be at least %d characters long", pv.policy.MinLength),
		}
	}

	// Check maximum length
	if len(password) > pv.policy.MaxLength {
		return PasswordValidationError{
			Field:   "password",
			Message: fmt.Sprintf("password must be no more than %d characters long", pv.policy.MaxLength),
		}
	}

	// Check for uppercase requirement
	if pv.policy.RequireUppercase {
		hasUpper := false
		for _, char := range password {
			if unicode.IsUpper(char) {
				hasUpper = true
				break
			}
		}
		if !hasUpper {
			return PasswordValidationError{
				Field:   "password",
				Message: "password must contain at least one uppercase letter",
			}
		}
	}

	// Check for lowercase requirement
	if pv.policy.RequireLowercase {
		hasLower := false
		for _, char := range password {
			if unicode.IsLower(char) {
				hasLower = true
				break
			}
		}
		if !hasLower {
			return PasswordValidationError{
				Field:   "password",
				Message: "password must contain at least one lowercase letter",
			}
		}
	}

	// Check for numbers requirement
	if pv.policy.RequireNumbers {
		hasNumber := false
		for _, char := range password {
			if unicode.IsDigit(char) {
				hasNumber = true
				break
			}
		}
		if !hasNumber {
			return PasswordValidationError{
				Field:   "password",
				Message: "password must contain at least one number",
			}
		}
	}

	// Check for special characters requirement
	if pv.policy.RequireSpecialChar {
		hasSpecial := false
		specialChars := "!@#$%^&*()_+-=[]{}|;:,.<>?`~"
		for _, char := range password {
			if strings.ContainsRune(specialChars, char) {
				hasSpecial = true
				break
			}
		}
		if !hasSpecial {
			return PasswordValidationError{
				Field:   "password",
				Message: "password must contain at least one special character (!@#$%^&*()_+-=[]{}|;:,.<>?`~)",
			}
		}
	}

	// Check against username (if provided)
	if pv.policy.PreventUsername && username != "" {
		if strings.Contains(strings.ToLower(password), strings.ToLower(username)) {
			return PasswordValidationError{
				Field:   "password",
				Message: "password cannot contain your username",
			}
		}
	}

	// Check against common passwords
	if pv.policy.PreventCommon {
		if pv.isCommonPassword(password) {
			return PasswordValidationError{
				Field:   "password",
				Message: "password is too common, please choose a more unique password",
			}
		}
	}

	return nil
}

// isCommonPassword checks if password is in a list of common passwords
func (pv *PasswordValidator) isCommonPassword(password string) bool {
	commonPasswords := []string{
		"password", "123456", "123456789", "qwerty", "abc123",
		"password123", "admin", "letmein", "welcome", "monkey",
		"dragon", "master", "sunshine", "password1", "123123",
		"admin123", "qwerty123", "welcome123", "adminadmin",
	}

	lowerPassword := strings.ToLower(password)
	for _, common := range commonPasswords {
		if lowerPassword == common {
			return true
		}
	}

	return false
}

// CalculatePasswordStrength calculates a password strength score (0-100)
func (pv *PasswordValidator) CalculatePasswordStrength(password string) int {
	score := 0
	length := len(password)

	// Length scoring
	if length >= 8 {
		score += 25
	}
	if length >= 12 {
		score += 15
	}
	if length >= 16 {
		score += 10
	}

	// Character variety scoring
	hasLower := regexp.MustCompile(`[a-z]`).MatchString(password)
	hasUpper := regexp.MustCompile(`[A-Z]`).MatchString(password)
	hasNumber := regexp.MustCompile(`[0-9]`).MatchString(password)
	hasSpecial := regexp.MustCompile(`[!@#$%^&*()_+\-=\[\]{}|;:,.<>?`+"`"+`~]`).MatchString(password)

	variety := 0
	if hasLower {
		variety++
	}
	if hasUpper {
		variety++
	}
	if hasNumber {
		variety++
	}
	if hasSpecial {
		variety++
	}

	score += variety * 15

	// Bonus for avoiding common patterns
	if !pv.isCommonPassword(password) {
		score += 10
	}

	// Ensure score doesn't exceed 100
	if score > 100 {
		score = 100
	}

	return score
}

// GetPasswordRequirements returns a list of password requirements for display
func (pv *PasswordValidator) GetPasswordRequirements() []string {
	var requirements []string

	if pv.policy.MinLength > 0 {
		requirements = append(requirements, fmt.Sprintf("At least %d characters long", pv.policy.MinLength))
	}

	if pv.policy.RequireUppercase {
		requirements = append(requirements, "At least one uppercase letter (A-Z)")
	}

	if pv.policy.RequireLowercase {
		requirements = append(requirements, "At least one lowercase letter (a-z)")
	}

	if pv.policy.RequireNumbers {
		requirements = append(requirements, "At least one number (0-9)")
	}

	if pv.policy.RequireSpecialChar {
		requirements = append(requirements, "At least one special character (!@#$%^&*()_+-=[]{}|;:,.<>?`~)")
	}

	if pv.policy.PreventCommon {
		requirements = append(requirements, "Not a commonly used password")
	}

	return requirements
}

// ValidatePasswordChange validates a password change request
func (pv *PasswordValidator) ValidatePasswordChange(newPassword, oldPassword, username string) error {
	// First validate the new password against policy
	if err := pv.ValidatePassword(newPassword, username); err != nil {
		return err
	}

	// Check if new password is different from old password
	if newPassword == oldPassword {
		return PasswordValidationError{
			Field:   "password",
			Message: "new password must be different from the current password",
		}
	}

	// Log password change attempt for security monitoring
	log.Info().
		Str("username", username).
		Int("password_strength", pv.CalculatePasswordStrength(newPassword)).
		Msg("Password change validation successful")

	return nil
}