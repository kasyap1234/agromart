package suppliers

import (
	"net/http"
	"strconv"

	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
)

type Handler struct {
	service *SupplierService
}

func NewHandler(service *SupplierService) *Handler {
	return &Handler{service: service}
}

// CreateSupplier creates a new supplier
func (h *Handler) CreateSupplier(c echo.Context) error {
	var req CreateSupplierRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid request body")
	}

	tenantID, err := uuid.Parse(c.Get("tenant_id").(string))
	if err != nil {
		return echo.NewHTTPError(http.StatusUnauthorized, "invalid tenant")
	}

	supplier, err := h.service.CreateSupplier(c.Request().Context(), CreateSupplierParams{
		TenantID:      tenantID,
		Name:          req.Name,
		ContactPerson: req.ContactPerson,
		Email:         req.Email,
		Phone:         req.Phone,
		Address:       req.Address,
		TaxID:         req.TaxID,
		PaymentMode:   req.PaymentMode,
	})
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	return c.JSON(http.StatusCreated, map[string]interface{}{
		"success": true,
		"data":    supplier,
		"message": "Supplier created successfully",
	})
}

// GetSupplier retrieves a supplier by ID
func (h *Handler) GetSupplier(c echo.Context) error {
	supplierID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid supplier ID")
	}

	tenantID, err := uuid.Parse(c.Get("tenant_id").(string))
	if err != nil {
		return echo.NewHTTPError(http.StatusUnauthorized, "invalid tenant")
	}

	supplier, err := h.service.GetSupplierByID(c.Request().Context(), supplierID, tenantID)
	if err != nil {
		return echo.NewHTTPError(http.StatusNotFound, "supplier not found")
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"success": true,
		"data":    supplier,
	})
}

// ListSuppliers lists all suppliers with pagination
func (h *Handler) ListSuppliers(c echo.Context) error {
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

	// Check if only active suppliers are requested
	activeOnly := c.QueryParam("active") == "true"

	var suppliers []interface{}

	if activeOnly {
		activeSuppliers, err := h.service.ListActiveSuppliers(c.Request().Context(), tenantID, int32(limit), offset)
		if err != nil {
			return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
		}
		for _, s := range activeSuppliers {
			suppliers = append(suppliers, s)
		}
	} else {
		allSuppliers, err := h.service.ListSuppliers(c.Request().Context(), tenantID, int32(limit), offset)
		if err != nil {
			return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
		}
		for _, s := range allSuppliers {
			suppliers = append(suppliers, s)
		}
	}

	// Get total count
	total, err := h.service.CountSuppliers(c.Request().Context(), tenantID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"success": true,
		"data":    suppliers,
		"pagination": map[string]interface{}{
			"page":  page,
			"limit": limit,
			"total": total,
			"pages": (total + int64(limit) - 1) / int64(limit),
		},
	})
}

// SearchSuppliers searches suppliers by name
func (h *Handler) SearchSuppliers(c echo.Context) error {
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

	suppliers, err := h.service.SearchSuppliers(c.Request().Context(), tenantID, query, int32(limit), offset)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"success": true,
		"data":    suppliers,
		"query":   query,
	})
}

// UpdateSupplier updates a supplier
func (h *Handler) UpdateSupplier(c echo.Context) error {
	supplierID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid supplier ID")
	}

	tenantID, err := uuid.Parse(c.Get("tenant_id").(string))
	if err != nil {
		return echo.NewHTTPError(http.StatusUnauthorized, "invalid tenant")
	}

	var req UpdateSupplierRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid request body")
	}

	supplier, err := h.service.UpdateSupplier(c.Request().Context(), UpdateSupplierParams{
		ID:            supplierID,
		TenantID:      tenantID,
		Name:          req.Name,
		ContactPerson: req.ContactPerson,
		Email:         req.Email,
		Phone:         req.Phone,
		Address:       req.Address,
		TaxID:         req.TaxID,
		PaymentMode:   req.PaymentMode,
		IsActive:      req.IsActive,
	})
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"success": true,
		"data":    supplier,
		"message": "Supplier updated successfully",
	})
}

// DeleteSupplier soft deletes a supplier
func (h *Handler) DeleteSupplier(c echo.Context) error {
	supplierID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid supplier ID")
	}

	tenantID, err := uuid.Parse(c.Get("tenant_id").(string))
	if err != nil {
		return echo.NewHTTPError(http.StatusUnauthorized, "invalid tenant")
	}

	err = h.service.DeleteSupplier(c.Request().Context(), supplierID, tenantID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "Supplier deactivated successfully",
	})
}

// RegisterRoutes registers all supplier routes
func (h *Handler) RegisterRoutes(g *echo.Group) {
	g.POST("/suppliers", h.CreateSupplier)
	g.GET("/suppliers", h.ListSuppliers)
	g.GET("/suppliers/search", h.SearchSuppliers)
	g.GET("/suppliers/:id", h.GetSupplier)
	g.PUT("/suppliers/:id", h.UpdateSupplier)
	g.DELETE("/suppliers/:id", h.DeleteSupplier)
}

// Request/Response types
type CreateSupplierRequest struct {
	Name          string `json:"name" validate:"required"`
	ContactPerson string `json:"contact_person"`
	Email         string `json:"email"`
	Phone         string `json:"phone"`
	Address       string `json:"address"`
	TaxID         string `json:"tax_id"`
	PaymentMode   string `json:"payment_mode"`
}

type UpdateSupplierRequest struct {
	Name          string `json:"name" validate:"required"`
	ContactPerson string `json:"contact_person"`
	Email         string `json:"email"`
	Phone         string `json:"phone"`
	Address       string `json:"address"`
	TaxID         string `json:"tax_id"`
	PaymentMode   string `json:"payment_mode"`
	IsActive      bool   `json:"is_active"`
}