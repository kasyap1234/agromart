package users

import (
	"net/http"
	"strconv"

	"agromart2/db"
	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
)

type UserHandler struct {
	service *UserService
}

func NewUserHandler(service *UserService) *UserHandler {
	return &UserHandler{service: service}
}

// RegisterRoutes registers user routes under provided group (expected to be /api)
func (h *UserHandler) RegisterRoutes(g *echo.Group) {
	g.POST("/users", h.CreateUser)
	g.GET("/users", h.ListUsers)
	g.GET("/users/search", h.SearchUsers)
	g.GET("/users/:id", h.GetUser)
	g.PUT("/users/:id", h.UpdateUser)
	g.DELETE("/users/:id", h.DeleteUser)
}

// CreateUser creates a new user
func (h *UserHandler) CreateUser(c echo.Context) error {
	var req struct {
		Name     string `json:"name" validate:"required"`
		Email    string `json:"email" validate:"required,email"`
		Password string `json:"password" validate:"required,min=8"`
		Phone    string `json:"phone"`
		Role     string `json:"role"`
	}
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid request body")
	}

	tenantVal := c.Get("tenant_id")
	tenantStr, ok := tenantVal.(string)
	if !ok || tenantStr == "" {
		return echo.NewHTTPError(http.StatusUnauthorized, "invalid tenant")
	}

	tenantID, err := uuid.Parse(tenantStr)
	if err != nil {
		return echo.NewHTTPError(http.StatusUnauthorized, "invalid tenant")
	}

	user, err := h.service.CreateUser(c.Request().Context(), CreateUserParams{
		TenantID: tenantID,
		Name:     req.Name,
		Email:    req.Email,
		Password: req.Password,
		Phone:    req.Phone,
		Role:     req.Role,
	})
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	return c.JSON(http.StatusCreated, map[string]any{
		"success": true,
		"data":    user,
		"message": "User created successfully",
	})
}

// GetUser returns a user by id
func (h *UserHandler) GetUser(c echo.Context) error {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid user ID")
	}

	tenantVal := c.Get("tenant_id")
	tenantStr, ok := tenantVal.(string)
	if !ok || tenantStr == "" {
		return echo.NewHTTPError(http.StatusUnauthorized, "invalid tenant")
	}

	tenantID, err := uuid.Parse(tenantStr)
	if err != nil {
		return echo.NewHTTPError(http.StatusUnauthorized, "invalid tenant")
	}

	user, err := h.service.GetUserByID(c.Request().Context(), id, tenantID)
	if err != nil {
		return echo.NewHTTPError(http.StatusNotFound, "user not found")
	}

	return c.JSON(http.StatusOK, map[string]any{
		"success": true,
		"data":    user,
	})
}

// ListUsers lists users with pagination and filtering
func (h *UserHandler) ListUsers(c echo.Context) error {
	tenantVal := c.Get("tenant_id")
	tenantStr, ok := tenantVal.(string)
	if !ok || tenantStr == "" {
		return echo.NewHTTPError(http.StatusUnauthorized, "invalid tenant")
	}

	tenantID, err := uuid.Parse(tenantStr)
	if err != nil {
		return echo.NewHTTPError(http.StatusUnauthorized, "invalid tenant")
	}

	page, _ := strconv.Atoi(c.QueryParam("page"))
	if page < 1 {
		page = 1
	}
	limit, _ := strconv.Atoi(c.QueryParam("limit"))
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := int32((page - 1) * limit)

	// Parse filter parameters
	roleFilter := c.QueryParam("role")

	items, err := h.service.ListUsers(c.Request().Context(), tenantID, int32(limit), offset)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	// Apply role filter if provided
	if roleFilter != "" {
		filteredItems := make([]db.User, 0)
		for _, user := range items {
			if user.Role == roleFilter {
				filteredItems = append(filteredItems, user)
			}
		}
		items = filteredItems
	}

	total, err := h.service.CountUsers(c.Request().Context(), tenantID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	out := make([]any, 0, len(items))
	for _, it := range items {
		out = append(out, it)
	}

	return c.JSON(http.StatusOK, map[string]any{
		"success": true,
		"data":    out,
		"pagination": map[string]any{
			"page":  page,
			"limit": limit,
			"total": total,
			"pages": (total + int64(limit) - 1) / int64(limit),
		},
	})
}

// SearchUsers searches users by name or email
func (h *UserHandler) SearchUsers(c echo.Context) error {
	tenantVal := c.Get("tenant_id")
	tenantStr, ok := tenantVal.(string)
	if !ok || tenantStr == "" {
		return echo.NewHTTPError(http.StatusUnauthorized, "invalid tenant")
	}

	tenantID, err := uuid.Parse(tenantStr)
	if err != nil {
		return echo.NewHTTPError(http.StatusUnauthorized, "invalid tenant")
	}
	q := c.QueryParam("q")
	if q == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "search query is required")
	}
	page, _ := strconv.Atoi(c.QueryParam("page"))
	if page < 1 {
		page = 1
	}
	limit, _ := strconv.Atoi(c.QueryParam("limit"))
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := int32((page - 1) * limit)

	items, err := h.service.SearchUsers(c.Request().Context(), tenantID, q, int32(limit), offset)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}
	out := make([]any, 0, len(items))
	for _, it := range items {
		out = append(out, it)
	}
	return c.JSON(http.StatusOK, map[string]any{
		"success": true,
		"data":    out,
		"query":   q,
	})
}

// UpdateUser updates a user
func (h *UserHandler) UpdateUser(c echo.Context) error {
	userID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid user ID")
	}

	tenantVal := c.Get("tenant_id")
	tenantStr, ok := tenantVal.(string)
	if !ok || tenantStr == "" {
		return echo.NewHTTPError(http.StatusUnauthorized, "invalid tenant")
	}

	tenantID, err := uuid.Parse(tenantStr)
	if err != nil {
		return echo.NewHTTPError(http.StatusUnauthorized, "invalid tenant")
	}

	var req struct {
		Name          string `json:"name" validate:"required"`
		Email         string `json:"email" validate:"required,email"`
		Phone         string `json:"phone"`
		Role          string `json:"role"`
		EmailVerified bool   `json:"email_verified"`
		IsActive      bool   `json:"is_active"`
	}
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid request body")
	}

	user, err := h.service.UpdateUser(c.Request().Context(), UpdateUserParams{
		ID:            userID,
		TenantID:      tenantID,
		Name:          req.Name,
		Email:         req.Email,
		Phone:         req.Phone,
		Role:          req.Role,
		EmailVerified: req.EmailVerified,
		IsActive:      req.IsActive,
	})
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	return c.JSON(http.StatusOK, map[string]any{
		"success": true,
		"data":    user,
		"message": "User updated successfully",
	})
}

// DeleteUser soft deletes a user
func (h *UserHandler) DeleteUser(c echo.Context) error {
	userID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid user ID")
	}

	tenantVal := c.Get("tenant_id")
	tenantStr, ok := tenantVal.(string)
	if !ok || tenantStr == "" {
		return echo.NewHTTPError(http.StatusUnauthorized, "invalid tenant")
	}

	tenantID, err := uuid.Parse(tenantStr)
	if err != nil {
		return echo.NewHTTPError(http.StatusUnauthorized, "invalid tenant")
	}

	if err := h.service.DeleteUser(c.Request().Context(), userID, tenantID); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	return c.JSON(http.StatusOK, map[string]any{
		"success": true,
		"message": "User deactivated successfully",
	})
}