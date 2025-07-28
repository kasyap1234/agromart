package handlers

import (
	"net/http"

	"github.com/go-playground/validator/v10"
	"github.com/google/uuid"
	"github.com/kasyap1234/agromart/services"
	"github.com/labstack/echo/v4"
)

type AuthHandler struct {
	authService *services.AuthService
	validator   *validator.Validate
}

func NewAuthHandler(authService *services.AuthService) *AuthHandler {
	return &AuthHandler{
		authService: authService,
		validator:   validator.New(),
	}
}

// Login godoc
// @Summary User login
// @Description Authenticate user and return JWT tokens
// @Tags auth
// @Accept json
// @Produce json
// @Param loginRequest body services.LoginRequest true "Login credentials"
// @Success 200 {object} services.AuthResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Router /auth/login [post]
func (h *AuthHandler) Login(c echo.Context) error {
	var req services.LoginRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "Invalid request body",
			Message: err.Error(),
		})
	}

	if err := h.validator.Struct(req); err != nil {
		return c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "Validation failed",
			Message: err.Error(),
		})
	}

	response, err := h.authService.Login(c.Request().Context(), req)
	if err != nil {
		return c.JSON(http.StatusUnauthorized, ErrorResponse{
			Error:   "Authentication failed",
			Message: err.Error(),
		})
	}

	return c.JSON(http.StatusOK, response)
}

// Register godoc
// @Summary User registration
// @Description Register a new user account
// @Tags auth
// @Accept json
// @Produce json
// @Param registerRequest body services.RegisterRequest true "Registration details"
// @Success 201 {object} services.AuthResponse
// @Failure 400 {object} ErrorResponse
// @Failure 409 {object} ErrorResponse
// @Router /auth/register [post]
func (h *AuthHandler) Register(c echo.Context) error {
	var req services.RegisterRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "Invalid request body",
			Message: err.Error(),
		})
	}

	if err := h.validator.Struct(req); err != nil {
		return c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "Validation failed",
			Message: err.Error(),
		})
	}

	response, err := h.authService.Register(c.Request().Context(), req)
	if err != nil {
		return c.JSON(http.StatusConflict, ErrorResponse{
			Error:   "Registration failed",
			Message: err.Error(),
		})
	}

	return c.JSON(http.StatusCreated, response)
}

// RefreshToken godoc
// @Summary Refresh access token
// @Description Generate new access token using refresh token
// @Tags auth
// @Accept json
// @Produce json
// @Param refreshTokenRequest body RefreshTokenRequest true "Refresh token"
// @Success 200 {object} services.AuthResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Router /auth/refresh [post]
func (h *AuthHandler) RefreshToken(c echo.Context) error {
	var req RefreshTokenRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "Invalid request body",
			Message: err.Error(),
		})
	}

	response, err := h.authService.RefreshToken(c.Request().Context(), req.RefreshToken)
	if err != nil {
		return c.JSON(http.StatusUnauthorized, ErrorResponse{
			Error:   "Token refresh failed",
			Message: err.Error(),
		})
	}

	return c.JSON(http.StatusOK, response)
}

// ChangePassword godoc
// @Summary Change user password
// @Description Change the current user's password
// @Tags auth
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param changePasswordRequest body services.ChangePasswordRequest true "Password change details"
// @Success 200 {object} SuccessResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Router /auth/change-password [post]
func (h *AuthHandler) ChangePassword(c echo.Context) error {
	claims := GetJWTClaims(c)
	if claims == nil {
		return c.JSON(http.StatusUnauthorized, ErrorResponse{
			Error:   "Unauthorized",
			Message: "Invalid or missing token",
		})
	}

	var req services.ChangePasswordRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "Invalid request body",
			Message: err.Error(),
		})
	}

	if err := h.validator.Struct(req); err != nil {
		return c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "Validation failed",
			Message: err.Error(),
		})
	}

	err := h.authService.ChangePassword(c.Request().Context(), claims.UserID, claims.TenantID, req)
	if err != nil {
		return c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "Password change failed",
			Message: err.Error(),
		})
	}

	return c.JSON(http.StatusOK, SuccessResponse{
		Message: "Password changed successfully",
	})
}

// GetProfile godoc
// @Summary Get user profile
// @Description Get current user's profile information
// @Tags auth
// @Produce json
// @Security BearerAuth
// @Success 200 {object} UserProfileResponse
// @Failure 401 {object} ErrorResponse
// @Router /auth/profile [get]
func (h *AuthHandler) GetProfile(c echo.Context) error {
	claims := GetJWTClaims(c)
	if claims == nil {
		return c.JSON(http.StatusUnauthorized, ErrorResponse{
			Error:   "Unauthorized",
			Message: "Invalid or missing token",
		})
	}

	return c.JSON(http.StatusOK, UserProfileResponse{
		ID:       claims.UserID,
		TenantID: claims.TenantID,
		Email:    claims.Email,
		Role:     claims.Role,
	})
}

// Helper structs for request/response
type RefreshTokenRequest struct {
	RefreshToken string `json:"refresh_token" validate:"required"`
}

type ErrorResponse struct {
	Error   string `json:"error"`
	Message string `json:"message"`
}

type SuccessResponse struct {
	Message string `json:"message"`
}

type UserProfileResponse struct {
	ID       uuid.UUID `json:"id"`
	TenantID uuid.UUID `json:"tenant_id"`
	Email    string    `json:"email"`
	Role     string    `json:"role"`
}

// GetJWTClaims extracts JWT claims from Echo context
func GetJWTClaims(c echo.Context) *services.JWTClaims {
	claims, ok := c.Get("user").(*services.JWTClaims)
	if !ok {
		return nil
	}
	return claims
}
