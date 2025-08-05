package customers

import (
	"net/http"
	"strconv"

	"agromart2/db"
	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
)

type CustomerHandler struct {
	service *CustomerService
}

func NewCustomerHandler(service *CustomerService) *CustomerHandler {
	return &CustomerHandler{service: service}
}

// RegisterRoutes registers customer routes under provided group (expected to be /api)
func (h *CustomerHandler) RegisterRoutes(g *echo.Group) {
	g.POST("/customers", h.CreateCustomer)
	g.GET("/customers", h.ListCustomers)
	g.GET("/customers/active", h.ListActiveCustomers)
	g.GET("/customers/search", h.SearchCustomers)
	g.GET("/customers/:id", h.GetCustomer)
	g.PUT("/customers/:id", h.UpdateCustomer)
	g.DELETE("/customers/:id", h.DeleteCustomer)
}

// CreateCustomer creates a new customer
func (h *CustomerHandler) CreateCustomer(c echo.Context) error {
	var req struct {
		Name          string `json:"name" validate:"required"`
		ContactPerson string `json:"contact_person"`
		Email         string `json:"email"`
		Phone         string `json:"phone"`
		Address       string `json:"address"`
		PaymentMode   string `json:"payment_mode"`
	}
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid request body")
	}

	tenantID, err := uuid.Parse(c.Get("tenant_id").(string))
	if err != nil {
		return echo.NewHTTPError(http.StatusUnauthorized, "invalid tenant")
	}

	customer, err := h.service.CreateCustomer(c.Request().Context(), CreateCustomerParams{
		TenantID:      tenantID,
		Name:          req.Name,
		ContactPerson: req.ContactPerson,
		Email:         req.Email,
		Phone:         req.Phone,
		Address:       req.Address,
		PaymentMode:   req.PaymentMode,
	})
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	return c.JSON(http.StatusCreated, map[string]any{
		"success": true,
		"data":    customer,
		"message": "Customer created successfully",
	})
}

// GetCustomer returns a customer by id
func (h *CustomerHandler) GetCustomer(c echo.Context) error {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid customer ID")
	}
	tenantID, err := uuid.Parse(c.Get("tenant_id").(string))
	if err != nil {
		return echo.NewHTTPError(http.StatusUnauthorized, "invalid tenant")
	}

	customer, err := h.service.GetCustomerByID(c.Request().Context(), id, tenantID)
	if err != nil {
		return echo.NewHTTPError(http.StatusNotFound, "customer not found")
	}

	return c.JSON(http.StatusOK, map[string]any{
		"success": true,
		"data":    customer,
	})
}

// ListCustomers lists customers with pagination
func (h *CustomerHandler) ListCustomers(c echo.Context) error {
	tenantID, err := uuid.Parse(c.Get("tenant_id").(string))
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

	items, err := h.service.ListCustomers(c.Request().Context(), tenantID, int32(limit), offset)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	total, err := h.service.CountCustomers(c.Request().Context(), tenantID)
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

// ListActiveCustomers lists active customers only
func (h *CustomerHandler) ListActiveCustomers(c echo.Context) error {
	tenantID, err := uuid.Parse(c.Get("tenant_id").(string))
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

	items, err := h.service.ListActiveCustomers(c.Request().Context(), tenantID, int32(limit), offset)
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
	})
}

// SearchCustomers searches customers by name (q param)
func (h *CustomerHandler) SearchCustomers(c echo.Context) error {
	tenantID, err := uuid.Parse(c.Get("tenant_id").(string))
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

	items, err := h.service.SearchCustomers(c.Request().Context(), tenantID, q, int32(limit), offset)
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

// UpdateCustomer updates a customer
func (h *CustomerHandler) UpdateCustomer(c echo.Context) error {
	customerID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid customer ID")
	}
	tenantID, err := uuid.Parse(c.Get("tenant_id").(string))
	if err != nil {
		return echo.NewHTTPError(http.StatusUnauthorized, "invalid tenant")
	}

	var req struct {
		Name          string `json:"name" validate:"required"`
		ContactPerson string `json:"contact_person"`
		Email         string `json:"email"`
		Phone         string `json:"phone"`
		Address       string `json:"address"`
		PaymentMode   string `json:"payment_mode"`
		IsActive      bool   `json:"is_active"`
	}
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid request body")
	}

	customer, err := h.service.UpdateCustomer(c.Request().Context(), UpdateCustomerParams{
		ID:            customerID,
		TenantID:      tenantID,
		Name:          req.Name,
		ContactPerson: req.ContactPerson,
		Email:         req.Email,
		Phone:         req.Phone,
		Address:       req.Address,
		PaymentMode:   req.PaymentMode,
		IsActive:      req.IsActive,
	})
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	return c.JSON(http.StatusOK, map[string]any{
		"success": true,
		"data":    customer,
		"message": "Customer updated successfully",
	})
}

// DeleteCustomer soft deletes a customer (deactivate)
func (h *CustomerHandler) DeleteCustomer(c echo.Context) error {
	customerID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid customer ID")
	}
	tenantID, err := uuid.Parse(c.Get("tenant_id").(string))
	if err != nil {
		return echo.NewHTTPError(http.StatusUnauthorized, "invalid tenant")
	}

	if err := h.service.DeleteCustomer(c.Request().Context(), customerID, tenantID); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	return c.JSON(http.StatusOK, map[string]any{
		"success": true,
		"message": "Customer deactivated successfully",
	})
}

// compile-time usage to avoid unused import warnings as signatures evolve
var _ = db.Customer{}