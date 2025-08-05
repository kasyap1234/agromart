package handler

// Auth DTOs for Swagger annotations and request binding

// RegisterRequestDTO represents the registration payload
// Fields mirror the legacy payload accepted by Register handler.
type RegisterRequestDTO struct {
	Name     string `json:"name"`
	Email    string `json:"email"`
	Password string `json:"password"`
	Phone    string `json:"phone"`
	Company  string `json:"company"`
}

// LoginRequestDTO represents the login payload
type LoginRequestDTO struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// RefreshTokenRequestDTO represents the refresh token payload
type RefreshTokenRequestDTO struct {
	RefreshToken string `json:"refresh_token"`
}

// UpdatePasswordRequestDTO represents the update password payload
type UpdatePasswordRequestDTO struct {
	CurrentPassword string `json:"current_password"`
	NewPassword     string `json:"new_password"`
}

// ForgotPasswordRequestDTO represents the forgot password payload
type ForgotPasswordRequestDTO struct {
	Email string `json:"email"`
}

// ResetPasswordRequestDTO represents the reset password payload
type ResetPasswordRequestDTO struct {
	Token       string `json:"token"`
	NewPassword string `json:"new_password"`
}