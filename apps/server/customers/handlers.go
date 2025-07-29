package customers

import (
	"net/http"
	"strconv"

	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
)

type Handler struct {
	service *CustomerService
}

func NewHandler(service *CustomerService) *Handler {
	return &Handler{service: service}
}

// CreateCustomer creates a new customer
func (h *Handler) CreateCustomer(c echo.Context) error {
	var req CreateCustomerRequest
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

	return c.JSON(http.StatusCreated, map[string]interface{}{
		"success": true,
		"data":    customer,
		"message": "Customer created successfully",
	})
}

// GetCustomer retrieves a customer by ID
func (h *Handler) GetCustomer(c echo.Context) error {
	customerID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid customer ID")
	}

	tenantID, err := uuid.Parse(c.Get("tenant_id").(string))
	if err != nil {
		return echo.NewHTTPError(http.StatusUnauthorized, "invalid tenant")
	}

	customer, err := h.service.GetCustomerByID(c.Request().Context(), customerID, tenantID)
	if err != nil {
		return echo.NewHTTPError(http.StatusNotFound, "customer not found")
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"success": true,
		"data":    customer,
	})
}

// ListCustomers lists all customers with pagination
func (h *Handler) ListCustomers(c echo.Context) error {
	tenantID, err := uuid.Parse(c.Get("tenant_id").(string))
	if err != nil {
		return echo.NewHTTPError(http.StatusUnauthorized, "invalid tenant")
	}

	// Parse pagination parameters
	page, _ := strconv.Atoi(c.QueryParam("page"))
	if page < 1 {
		page = 1
	}

	limit, _ := strconv.Atoi(c.QueryParam("limit"))
	if limit < 1 || limit > 100 {
		limit = 20
	}

	offset := int32((page - 1) * limit)

	// Check if only active customers are requested
	activeOnly := c.QueryParam("active") == "true"

	var customers []interface{}

	if activeOnly {
		activeCustomers, err := h.service.ListActiveCustomers(c.Request().Context(), tenantID, int32(limit), offset)
		if err != nil {
			return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
		}
		for _, s := range activeCustomers {
			customers = append(customers, s)
		}
	} else {
		allCustomers, err := h.service.ListCustomers(c.Request().Context(), tenantID, int32(limit), offset)
		if err != nil {
			return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
		}
		for _, s := range allCustomers {
			customers = append(customers, s)
		}
	}

	// Get total count
	total, err := h.service.CountCustomers(c.Request().Context(), tenantID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"success": true,
		"data":    customers,
		"pagination": map[string]interface{}{
			"page":  page,
			"limit": limit,
			"total": total,
			"pages": (total + int64(limit) - 1) / int64(limit),
		},
	})
}

// SearchCustomers searches customers by name
func (h *Handler) SearchCustomers(c echo.Context) error {
	tenantID, err := uuid.Parse(c.Get("tenant_id").(string))
	if err != nil {
		return echo.NewHTTPError(http.StatusUnauthorized, "invalid tenant")
	}

	query := c.QueryParam("q")
	if query == "" {
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

	customers, err := h.service.SearchCustomers(c.Request().Context(), tenantID, query, int32(limit), offset)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"success": true,
		"data":    customers,
		"query":   query,
	})
}

// UpdateCustomer updates a customer
func (h *Handler) UpdateCustomer(c echo.Context) error {
	customerID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid customer ID")
	}

	tenantID, err := uuid.Parse(c.Get("tenant_id").(string))
	if err != nil {
		return echo.NewHTTPError(http.StatusUnauthorized, "invalid tenant")
	}

	var req UpdateCustomerRequest
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

	return c.JSON(http.StatusOK, map[string]interface{}{
		"success": true,
		"data":    customer,
		"message": "Customer updated successfully",
	})
}

// DeleteCustomer soft deletes a customer
func (h *Handler) DeleteCustomer(c echo.Context) error {
	customerID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid customer ID")
	}

	tenantID, err := uuid.Parse(c.Get("tenant_id").(string))
	if err != nil {
		return echo.NewHTTPError(http.StatusUnauthorized, "invalid tenant")
	}

	err = h.service.DeleteCustomer(c.Request().Context(), customerID, tenantID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "Customer deactivated successfully",
	})
}

// RegisterRoutes registers all customer routes
func (h *Handler) RegisterRoutes(g *echo.Group) {
	g.POST("/customers", h.CreateCustomer)
	g.GET("/customers", h.ListCustomers)
	g.GET("/customers/search", h.SearchCustomers)
	g.GET("/customers/:id", h.GetCustomer)
	g.PUT("/customers/:id", h.UpdateCustomer)
	g.DELETE("/customers/:id", h.DeleteCustomer)
}

// Request/Response types
type CreateCustomerRequest struct {
	Name          string `json:"name" validate:"required"`
	ContactPerson string `json:"contact_person"`
	Email         string `json:"email"`
	Phone         string `json:"phone"`
	Address       string `json:"address"`
	PaymentMode   string `json:"payment_mode"`
}

type UpdateCustomerRequest struct {
	Name          string `json:"name" validate:"required"`
	ContactPerson string `json:"contact_person"`
	Email         string `json:"email"`
	Phone         string `json:"phone"`
	Address       string `json:"address"`
	PaymentMode   string `json:"payment_mode"`
	IsActive      bool   `json:"is_active"`
}