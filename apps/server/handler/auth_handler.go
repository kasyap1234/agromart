package handler

import (
	"net/http"

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

// Register handles user registration
func (h *AuthHandler) Register(c echo.Context) error {
	// Accept legacy payload: { name, email, password, phone, company }
	var legacy struct {
		Name     string `json:"name"`
		Email    string `json:"email"`
		Password string `json:"password"`
		Phone    string `json:"phone"`
		Company  string `json:"company"`
	}
	if err := c.Bind(&legacy); err != nil {
		_ = c.JSON(http.StatusBadRequest, map[string]interface{}{
			"success": false,
			"error": map[string]interface{}{
				"code":    http.StatusBadRequest,
				"message": "invalid request body",
			},
		})
		return nil
	}

	trim := func(s string) string {
		b := []rune(s)
		i, j := 0, len(b)-1
		for i <= j && (b[i] == ' ' || b[i] == '\t' || b[i] == '\n' || b[i] == '\r') {
			i++
		}
		for j >= i && (b[j] == ' ' || b[j] == '\t' || b[j] == '\n' || b[j] == '\r') {
			j--
		}
		if i > j {
			return ""
		}
		return string(b[i : j+1])
	}
	legacy.Name = trim(legacy.Name)
	legacy.Email = trim(legacy.Email)
	legacy.Password = trim(legacy.Password)
	legacy.Phone = trim(legacy.Phone)
	legacy.Company = trim(legacy.Company)

	// Defaults for optional/missing legacy fields
	if legacy.Company == "" {
		legacy.Company = "Test Company"
	}
	if legacy.Name == "" {
		legacy.Name = "Test User"
	}

	// Build service DTO
	var req internalauth.RegisterRequest
	req.Email = legacy.Email
	req.Password = legacy.Password
	req.Phone = legacy.Phone
	req.CompanyName = legacy.Company

	// Split name
	if legacy.Name != "" {
		nameRunes := []rune(legacy.Name)
		spaceIdx := -1
		for i, r := range nameRunes {
			if r == ' ' {
				spaceIdx = i
				break
			}
		}
		if spaceIdx >= 0 {
			req.FirstName = string(nameRunes[:spaceIdx])
			req.LastName = string(nameRunes[spaceIdx+1:])
		} else {
			req.FirstName = legacy.Name
			req.LastName = "User"
		}
	}
	if req.FirstName == "" {
		req.FirstName = "User"
	}
	if req.LastName == "" {
		req.LastName = "User"
	}

	// Final required checks - respond directly with JSON to preserve 4xx
	if req.Email == "" || req.Password == "" || req.CompanyName == "" {
		c.Response().Header().Set("X-Handler-Error", "register-missing-required-fields")
		_ = c.JSON(http.StatusBadRequest, map[string]interface{}{
			"success": false,
			"error": map[string]interface{}{
				"code":    http.StatusBadRequest,
				"message": "missing required fields",
				"details": "email, password, and company_name are required",
			},
		})
		return nil
	}

	resp, err := h.authService.Register(c.Request().Context(), req)
	if err != nil {
		// Map known validation/missing-field errors deterministically
		msg := toLowerASCII(err.Error())
		switch {
		case indexOf(msg, "duplicate") >= 0 || indexOf(msg, "unique") >= 0 || indexOf(msg, "already exists") >= 0 || indexOf(msg, "conflict") >= 0:
			_ = c.JSON(http.StatusConflict, map[string]interface{}{
				"success": false,
				"error": map[string]interface{}{
					"code":    http.StatusConflict,
					"message": "email already exists",
				},
			})
			return nil
		case indexOf(msg, "invalid") >= 0 || indexOf(msg, "missing") >= 0 || indexOf(msg, "bad request") >= 0 || indexOf(msg, "code=400") >= 0:
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
					"details": err.Error(),
				},
			})
			return nil
		}
	}

	if err := c.JSON(http.StatusCreated, map[string]interface{}{
		"success": true,
		"data": map[string]interface{}{
			"user":          resp.User,
			"token":         resp.Token,
			"refresh_token": resp.RefreshToken,
		},
		"message": "User registered successfully",
	}); err != nil {
		return err
	}
	return nil
}

// Login handles user authentication
func (h *AuthHandler) Login(c echo.Context) error {
	var req internalauth.LoginRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{
			"success": false,
			"error": map[string]interface{}{
				"code":    http.StatusBadRequest,
				"message": "invalid request body",
			},
		})
	}

	// Basic validation
	if req.Email == "" || req.Password == "" {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{
			"success": false,
			"error": map[string]interface{}{
				"code":    http.StatusBadRequest,
				"message": "email and password are required",
			},
		})
	}

	response, err := h.authService.Login(c.Request().Context(), req)
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
			"user":          response.User,
			"token":         response.Token,
			"refresh_token": response.RefreshToken,
		},
		"message": "Login successful",
	}); err != nil {
		return err
	}
	return nil
}

// Me returns current user information
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
	if ut, err := h.authService.GetUserWithTenant(c.Request().Context(), userID); err == nil && ut != nil {
		if err := c.JSON(http.StatusOK, map[string]interface{}{
			"success": true,
			"data": map[string]interface{}{
				"user":   ut.User,
				"tenant": ut.Tenant,
			},
		}); err != nil {
			return err
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

// RefreshToken generates new access token from refresh token
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

// UpdatePassword updates user password
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
					"details": err.Error(),
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

// Logout handles user logout (client-side token removal)
func (h *AuthHandler) Logout(c echo.Context) error {
	// In a stateless JWT system, logout is typically handled client-side
	// by removing the token. However, you could implement token blacklisting here
	return c.JSON(http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "Logged out successfully",
	})
}

// RegisterRoutes registers all auth routes
func (h *AuthHandler) RegisterRoutes(e *echo.Echo) {
	auth := e.Group("/api/auth")
	
	auth.POST("/register", h.Register)
	auth.POST("/login", h.Login)
	auth.POST("/refresh", h.RefreshToken)
	auth.POST("/logout", h.Logout)
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
func (h *AuthHandler) RegisterProtectedRoutes(g *echo.Group) {
	g.GET("/me", h.Me)
	g.PUT("/password", h.UpdatePassword)
}
