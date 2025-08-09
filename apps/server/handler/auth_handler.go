package handler

import (
	"net/http"
	"os"
	"time"

	internalauth "agromart2/internal/auth"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
)

/* remove local DTOs to align with auth service */

/* remove local DTOs to align with auth service */

type CustomClaims struct {
	ID   uint   `json:"id"`
	Role string `json:"role"`
	jwt.RegisteredClaims
}

type AuthHandler struct {
	authService *internalauth.AuthService
}

func NewAuthHandler(authService *internalauth.AuthService) *AuthHandler {
	return &AuthHandler{
		authService: authService,
	}
}

// Register godoc
// @Summary Register a new user and tenant
// @Description Creates a new tenant and the first user (admin) within that tenant
// @Tags auth
// @Accept json
// @Produce json
// @Param payload body handler.RegisterRequestDTO true "Registration payload"
// @Success 201 {object} map[string]interface{} "user, token, refresh_token"
// @Failure 400 {object} map[string]interface{} "missing or invalid fields"
// @Failure 409 {object} map[string]interface{} "email already exists"
// @Failure 500 {object} map[string]interface{} "internal error"
// @Router /auth/register [post]
func (h *AuthHandler) Register(c echo.Context) error {
	var req internalauth.RegisterRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid request body")
	}

	resp, err := h.authService.Register(c.Request().Context(), req)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	return c.JSON(http.StatusCreated, resp)
}

// Login godoc
// @Summary Login
// @Description Authenticates a user and returns access and refresh tokens
// @Tags auth
// @Accept json
// @Produce json
// @Param payload body internalauth.LoginRequest true "Login payload"
// @Success 200 {object} map[string]interface{} "user, token, refresh_token"
// @Failure 400 {object} map[string]interface{} "invalid request body"
// @Failure 401 {object} map[string]interface{} "invalid credentials"
// @Router /auth/login [post]
func (h *AuthHandler) Login(c echo.Context) error {
	var req internalauth.LoginRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid request body")
	}

	resp, err := h.authService.Login(c.Request().Context(), req)
	if err != nil {
		return echo.NewHTTPError(http.StatusUnauthorized, err.Error())
	}

	return c.JSON(http.StatusOK, resp)
}

// Me godoc
// @Summary Get current user
// @Description Returns the authenticated user and tenant information
// @Tags auth
// @Produce json
// @Security Bearer
// @Success 200 {object} map[string]interface{} "user (+ tenant if available)"
// @Failure 401 {object} map[string]interface{} "missing/invalid auth"
// @Router /auth/me [get]
func (h *AuthHandler) Me(c echo.Context) error {
	userIDVal := c.Get("user_id")
	userIDStr, _ := userIDVal.(string)
	if userIDStr == "" {
		_ = c.JSON(http.StatusUnauthorized, map[string]interface{}{
			"success": false,
			"error": map[string]interface{}{
				"code":    http.StatusUnauthorized,
				"message": "missing user ID",
			},
		})
		return nil
	}

	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		_ = c.JSON(http.StatusUnauthorized, map[string]interface{}{
			"success": false,
			"error": map[string]interface{}{
				"code":    http.StatusUnauthorized,
				"message": "invalid user ID",
			},
		})
		return nil
	}

	// Try full user + tenant via service helper
	if ut, serviceErr := h.authService.GetUserWithTenant(c.Request().Context(), userID); serviceErr == nil && ut != nil {
		if jsonErr := c.JSON(http.StatusOK, map[string]interface{}{
			"success": true,
			"data": map[string]interface{}{
				"user":   ut.User,
				"tenant": ut.Tenant,
			},
		}); jsonErr != nil {
			return jsonErr
		}
		return nil
	}

	// Fallback to user only
	user, err := h.authService.GetUserByID(c.Request().Context(), userID)
	if err != nil {
		_ = c.JSON(http.StatusNotFound, map[string]interface{}{
			"success": false,
			"error": map[string]interface{}{
				"code":    http.StatusNotFound,
				"message": "user not found",
			},
		})
		return nil
	}
	if err := c.JSON(http.StatusOK, map[string]interface{}{
		"success": true,
		"data": map[string]interface{}{
			"user": user,
		},
	}); err != nil {
		return err
	}
	return nil
}

// RefreshToken godoc
// @Summary Refresh access token
// @Description Generates a new access token using a valid refresh token
// @Tags auth
// @Accept json
// @Produce json
// @Param payload body handler.RefreshTokenRequestDTO true "Refresh token payload"
// @Success 200 {object} map[string]interface{} "user, token, refresh_token"
// @Failure 400 {object} map[string]interface{} "invalid request body"
// @Failure 401 {object} map[string]interface{} "invalid/expired refresh token"
// @Router /auth/refresh [post]
func (h *AuthHandler) RefreshToken(c echo.Context) error {
	var req struct {
		RefreshToken string `json:"refresh_token"`
	}

	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{
			"success": false,
			"error": map[string]interface{}{
				"code":    http.StatusBadRequest,
				"message": "invalid request body",
			},
		})
	}

	if req.RefreshToken == "" {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{
			"success": false,
			"error": map[string]interface{}{
				"code":    http.StatusBadRequest,
				"message": "refresh token is required",
			},
		})
	}

	resp, err := h.authService.RefreshToken(c.Request().Context(), req.RefreshToken)
	if err != nil {
		return c.JSON(http.StatusUnauthorized, map[string]interface{}{
			"success": false,
			"error": map[string]interface{}{
				"code":    http.StatusUnauthorized,
				"message": err.Error(),
			},
		})
	}
	if err := c.JSON(http.StatusOK, map[string]interface{}{
		"success": true,
		"data": map[string]interface{}{
			"user":          resp.User,
			"token":         resp.Token,
			"refresh_token": resp.RefreshToken,
		},
		"message": "Token refreshed successfully",
	}); err != nil {
		return err
	}
	return nil
}

// UpdatePassword godoc
// @Summary Update password
// @Description Updates the authenticated user's password
// @Tags auth
// @Accept json
// @Produce json
// @Security Bearer
// @Param payload body handler.UpdatePasswordRequestDTO true "Update password payload"
// @Success 200 {object} map[string]interface{} "success message"
// @Failure 400 {object} map[string]interface{} "invalid request body"
// @Failure 401 {object} map[string]interface{} "missing/invalid auth"
// @Failure 404 {object} map[string]interface{} "user not found"
// @Router /password [put]
func (h *AuthHandler) UpdatePassword(c echo.Context) error {
	var req struct {
		CurrentPassword string `json:"current_password"`
		NewPassword     string `json:"new_password"`
	}
	if err := c.Bind(&req); err != nil {
		_ = c.JSON(http.StatusBadRequest, map[string]interface{}{
			"success": false,
			"error": map[string]interface{}{
				"code":    http.StatusBadRequest,
				"message": "invalid request body",
			},
		})
		return nil
	}
	if req.CurrentPassword == "" || req.NewPassword == "" {
		_ = c.JSON(http.StatusBadRequest, map[string]interface{}{
			"success": false,
			"error": map[string]interface{}{
				"code":    http.StatusBadRequest,
				"message": "current password and new password are required",
			},
		})
		return nil
	}

	userIDStr, _ := c.Get("user_id").(string)
	if userIDStr == "" {
		_ = c.JSON(http.StatusUnauthorized, map[string]interface{}{
			"success": false,
			"error": map[string]interface{}{
				"code":    http.StatusUnauthorized,
				"message": "missing user ID",
			},
		})
		return nil
	}
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		_ = c.JSON(http.StatusUnauthorized, map[string]interface{}{
			"success": false,
			"error": map[string]interface{}{
				"code":    http.StatusUnauthorized,
				"message": "invalid user ID",
			},
		})
		return nil
	}

	tenantIDStr, _ := c.Get("tenant_id").(string)
	if tenantIDStr == "" {
		_ = c.JSON(http.StatusUnauthorized, map[string]interface{}{
			"success": false,
			"error": map[string]interface{}{
				"code":    http.StatusUnauthorized,
				"message": "missing tenant ID",
			},
		})
		return nil
	}
	tenantID, err := uuid.Parse(tenantIDStr)
	if err != nil {
		_ = c.JSON(http.StatusUnauthorized, map[string]interface{}{
			"success": false,
			"error": map[string]interface{}{
				"code":    http.StatusUnauthorized,
				"message": "invalid tenant ID",
			},
		})
		return nil
	}

	// Verify current password by attempting login (password check)
	userEmail, _ := c.Get("user_email").(string)
	if userEmail == "" {
		_ = c.JSON(http.StatusUnauthorized, map[string]interface{}{
			"success": false,
			"error": map[string]interface{}{
				"code":    http.StatusUnauthorized,
				"message": "missing user email",
			},
		})
		return nil
	}
	_, err = h.authService.Login(c.Request().Context(), internalauth.LoginRequest{
		Email:    userEmail,
		Password: req.CurrentPassword,
	})
	if err != nil {
		lm := toLowerASCII(err.Error())
		if indexOf(lm, "code=404") >= 0 || indexOf(lm, "not found") >= 0 {
			_ = c.JSON(http.StatusNotFound, map[string]interface{}{
				"success": false,
				"error": map[string]interface{}{
					"code":    http.StatusNotFound,
					"message": "user not found",
				},
			})
			return nil
		}
		_ = c.JSON(http.StatusUnauthorized, map[string]interface{}{
			"success": false,
			"error": map[string]interface{}{
				"code":    http.StatusUnauthorized,
				"message": "current password is incorrect",
			},
		})
		return nil
	}

	if err := h.authService.UpdatePassword(c.Request().Context(), userID, tenantID, req.NewPassword); err != nil {
		msg := toLowerASCII(err.Error())
		switch {
		case indexOf(msg, "no rows") >= 0 || indexOf(msg, "not found") >= 0 || indexOf(msg, "code=404") >= 0:
			_ = c.JSON(http.StatusNotFound, map[string]interface{}{
				"success": false,
				"error": map[string]interface{}{
					"code":    http.StatusNotFound,
					"message": "user not found",
				},
			})
			return nil
		case indexOf(msg, "invalid") >= 0 || indexOf(msg, "weak") >= 0 || indexOf(msg, "bad request") >= 0:
			_ = c.JSON(http.StatusBadRequest, map[string]interface{}{
				"success": false,
				"error": map[string]interface{}{
					"code":    http.StatusBadRequest,
					"message": err.Error(),
				},
			})
			return nil
		default:
			_ = c.JSON(http.StatusInternalServerError, map[string]interface{}{
				"success": false,
				"error": map[string]interface{}{
					"code":    http.StatusInternalServerError,
					"message": "internal server error",
				},
			})
			return nil
		}
	}

	_ = c.JSON(http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "Password updated successfully",
	})
	return nil
}

// Logout godoc
// @Summary Logout
// @Description Stateless logout (client removes token)
// @Tags auth
// @Produce json
// @Success 200 {object} map[string]interface{} "success message"
// @Router /auth/logout [post]
func (h *AuthHandler) Logout(c echo.Context) error {
	// In a stateless JWT system, logout is typically handled client-side
	// by removing the token. However, you could implement token blacklisting here
	return c.JSON(http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "Logged out successfully",
	})
}

// PasswordForgot godoc
// @Summary Initiate password reset
// @Description Always returns 200 to prevent user enumeration. In development/local, returns a reset_token for testing.
// @Tags auth
// @Accept json
// @Produce json
// @Param payload body handler.ForgotPasswordRequestDTO true "Forgot password payload"
// @Success 200 {object} map[string]interface{} "success message; in dev includes reset_token"
// @Router /auth/password/forgot [post]
func PasswordForgot(s *internalauth.AuthService, c echo.Context) error {
	var req struct {
		Email string `json:"email"`
	}
	_ = c.Bind(&req) // ignore bind error; we will handle empty email below

	// Normalize email quick-and-dirty without importing strings
	email := toLowerASCII(req.Email)

	// Generate a reset token regardless of whether the email exists
	// TTL default 15m
	token, _ := s.GenerateResetToken(email, 15*time.Minute)

	resp := map[string]interface{}{
		"success": true,
		"message": "If the email exists, a password reset link has been sent.",
	}

	// In dev mode, include token for testing convenience
	if env := os.Getenv("APP_ENV"); env == "" || env == "development" || env == "local" {
		resp["data"] = map[string]interface{}{
			"reset_token": token,
		}
	}

	return c.JSON(http.StatusOK, resp)
}

// PasswordReset godoc
// @Summary Complete password reset
// @Description Resets password using a stateless reset token containing the email claim
// @Tags auth
// @Accept json
// @Produce json
// @Param payload body handler.ResetPasswordRequestDTO true "Reset password payload"
// @Success 200 {object} map[string]interface{} "success message"
// @Failure 400 {object} map[string]interface{} "invalid or expired token / invalid payload"
// @Failure 500 {object} map[string]interface{} "internal error"
// @Router /auth/password/reset [post]
func PasswordReset(s *internalauth.AuthService, c echo.Context) error {
	var req struct {
		Token       string `json:"token"`
		NewPassword string `json:"new_password"`
	}
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{
			"success": false,
			"error": map[string]interface{}{
				"code":    http.StatusBadRequest,
				"message": "invalid request body",
			},
		})
	}
	if len(req.NewPassword) < 6 || req.Token == "" {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{
			"success": false,
			"error": map[string]interface{}{
				"code":    http.StatusBadRequest,
				"message": "token and a new_password of at least 6 characters are required",
			},
		})
	}

	claims, err := s.ValidateResetToken(req.Token)
	if err != nil || claims == nil || claims.Email == "" {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{
			"success": false,
			"error": map[string]interface{}{
				"code":    http.StatusBadRequest,
				"message": "invalid or expired reset token",
			},
		})
	}

	// Find user by email (active users only)
	user, err := s.GetUserByEmail(c.Request().Context(), claims.Email)
	if err != nil || user == nil {
		// Avoid leaking enumeration; return generic error
		return c.JSON(http.StatusBadRequest, map[string]interface{}{
			"success": false,
			"error": map[string]interface{}{
				"code":    http.StatusBadRequest,
				"message": "invalid or expired reset token",
			},
		})
	}

	// Update password; requires userID and tenantID
	if err := s.UpdatePassword(c.Request().Context(), user.ID, user.TenantID, req.NewPassword); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]interface{}{
			"success": false,
			"error": map[string]interface{}{
			"code":    http.StatusInternalServerError,
			"message": "failed to reset password",
			},
		})
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "Password has been reset successfully",
	})
}

// RegisterRoutes registers all auth routes
// @Tags auth
// @Router /auth [get]
func (h *AuthHandler) RegisterRoutes(e *echo.Echo) {
	auth := e.Group("/api/auth")
	
	auth.POST("/register", h.Register)
	auth.POST("/login", h.Login)
	auth.POST("/refresh", h.RefreshToken)
	auth.POST("/logout", h.Logout)

	// Public password reset routes
	auth.POST("/password/forgot", func(c echo.Context) error { return PasswordForgot(h.authService, c) })
	auth.POST("/password/reset", func(c echo.Context) error { return PasswordReset(h.authService, c) })
}

// indexOf returns the index of sub in s or -1 (ASCII; no strings import)
func indexOf(s string, sub string) int {
	if len(sub) == 0 || len(s) < len(sub) {
		return -1
	}
	for i := 0; i <= len(s)-len(sub); i++ {
		match := true
		for j := 0; j < len(sub); j++ {
			if s[i+j] != sub[j] {
				match = false
				break
			}
		}
		if match {
			return i
		}
	}
	return -1
}

// toLowerASCII lowercases A-Z without importing strings
func toLowerASCII(in string) string {
	b := []byte(in)
	for i := range b {
		if b[i] >= 'A' && b[i] <= 'Z' {
			b[i] += 32
		}
	}
	return string(b)
}

// RegisterProtectedRoutes registers protected auth routes
// @Tags auth
// @Security Bearer
func (h *AuthHandler) RegisterProtectedRoutes(g *echo.Group) {
	g.GET("/me", h.Me)
	g.PUT("/password", h.UpdatePassword)
}
