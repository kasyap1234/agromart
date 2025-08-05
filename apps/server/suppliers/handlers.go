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

// CreateSupplier godoc
// @Summary Create supplier
// @Description Creates a new supplier in the current tenant
// @Tags suppliers
// @Security Bearer
// @Accept json
// @Produce json
// @Param payload body CreateSupplierRequest true "Create supplier payload"
// @Success 201 {object} map[string]interface{} "created supplier"
// @Failure 400 {object} map[string]interface{} "invalid body"
// @Failure 401 {object} map[string]interface{} "invalid tenant/auth"
// @Failure 500 {object} map[string]interface{} "internal error"
// @Router /suppliers [post]
func (h *Handler) CreateSupplier(c echo.Context) error {
	var req CreateSupplierRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{
			"success": false,
			"error": map[string]interface{}{
				"code":    http.StatusBadRequest,
				"message": "invalid request body",
			},
		})
	}
	if req.Name == "" {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{
			"success": false,
			"error": map[string]interface{}{
				"code":    http.StatusBadRequest,
				"message": "name is required",
			},
		})
	}

	tenantStr, _ := c.Get("tenant_id").(string)
	tenantID, err := uuid.Parse(tenantStr)
	if err != nil || tenantStr == "" {
		return c.JSON(http.StatusUnauthorized, map[string]interface{}{
			"success": false,
			"error": map[string]interface{}{
				"code":    http.StatusUnauthorized,
				"message": "invalid tenant",
			},
		})
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
		return c.JSON(http.StatusInternalServerError, map[string]interface{}{
			"success": false,
			"error": map[string]interface{}{
				"code":    http.StatusInternalServerError,
				"message": err.Error(),
			},
		})
	}

	return c.JSON(http.StatusCreated, map[string]interface{}{
		"success": true,
		"data":    supplier,
		"message": "Supplier created successfully",
	})
}

// GetSupplier godoc
// @Summary Get supplier
// @Description Retrieves a supplier by ID
// @Tags suppliers
// @Security Bearer
// @Produce json
// @Param id path string true "Supplier ID (UUID)"
// @Success 200 {object} map[string]interface{} "supplier"
// @Failure 400 {object} map[string]interface{} "invalid id"
// @Failure 401 {object} map[string]interface{} "invalid tenant/auth"
// @Failure 404 {object} map[string]interface{} "not found"
// @Router /suppliers/{id} [get]
func (h *Handler) GetSupplier(c echo.Context) error {
	supplierID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{
			"success": false,
			"error": map[string]interface{}{
				"code":    http.StatusBadRequest,
				"message": "invalid supplier ID",
			},
		})
	}

	tenantStr, _ := c.Get("tenant_id").(string)
	tenantID, err := uuid.Parse(tenantStr)
	if err != nil || tenantStr == "" {
		return c.JSON(http.StatusUnauthorized, map[string]interface{}{
			"success": false,
			"error": map[string]interface{}{
				"code":    http.StatusUnauthorized,
				"message": "invalid tenant",
			},
		})
	}

	supplier, err := h.service.GetSupplierByID(c.Request().Context(), supplierID, tenantID)
	if err != nil {
		return c.JSON(http.StatusNotFound, map[string]interface{}{
			"success": false,
			"error": map[string]interface{}{
				"code":    http.StatusNotFound,
				"message": "supplier not found",
			},
		})
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"success": true,
		"data":    supplier,
	})
}

// ListSuppliers godoc
// @Summary List suppliers
// @Description Lists suppliers with pagination. Use active=true to only include active suppliers.
// @Tags suppliers
// @Security Bearer
// @Produce json
// @Param page query int false "Page number" minimum(1)
// @Param limit query int false "Items per page (1-100)" minimum(1) maximum(100)
// @Param active query bool false "Only active suppliers"
// @Success 200 {object} map[string]interface{} "items and pagination"
// @Failure 401 {object} map[string]interface{} "invalid tenant/auth"
// @Failure 500 {object} map[string]interface{} "internal error"
// @Router /suppliers [get]
func (h *Handler) ListSuppliers(c echo.Context) error {
	tenantStr, _ := c.Get("tenant_id").(string)
	tenantID, err := uuid.Parse(tenantStr)
	if err != nil || tenantStr == "" {
		return c.JSON(http.StatusUnauthorized, map[string]interface{}{
			"success": false,
			"error": map[string]interface{}{
				"code":    http.StatusUnauthorized,
				"message": "invalid tenant",
			},
		})
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
			return c.JSON(http.StatusInternalServerError, map[string]interface{}{
				"success": false,
				"error": map[string]interface{}{
					"code":    http.StatusInternalServerError,
					"message": err.Error(),
				},
			})
		}
		for _, s := range activeSuppliers {
			suppliers = append(suppliers, s)
		}
	} else {
		allSuppliers, err := h.service.ListSuppliers(c.Request().Context(), tenantID, int32(limit), offset)
		if err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]interface{}{
				"success": false,
				"error": map[string]interface{}{
					"code":    http.StatusInternalServerError,
					"message": err.Error(),
				},
			})
		}
		for _, s := range allSuppliers {
			suppliers = append(suppliers, s)
		}
	}

	// Get total count
	total, err := h.service.CountSuppliers(c.Request().Context(), tenantID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]interface{}{
			"success": false,
			"error": map[string]interface{}{
				"code":    http.StatusInternalServerError,
				"message": err.Error(),
			},
		})
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

// SearchSuppliers godoc
// @Summary Search suppliers
// @Description Searches suppliers by name
// @Tags suppliers
// @Security Bearer
// @Produce json
// @Param q query string true "Search query"
// @Param page query int false "Page number" minimum(1)
// @Param limit query int false "Items per page (1-100)" minimum(1) maximum(100)
// @Success 200 {object} map[string]interface{} "items and query"
// @Failure 400 {object} map[string]interface{} "missing query"
// @Failure 401 {object} map[string]interface{} "invalid tenant/auth"
// @Failure 500 {object} map[string]interface{} "internal error"
// @Router /suppliers/search [get]
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

// UpdateSupplier godoc
// @Summary Update supplier
// @Description Updates a supplier by ID
// @Tags suppliers
// @Security Bearer
// @Accept json
// @Produce json
// @Param id path string true "Supplier ID (UUID)"
// @Param payload body UpdateSupplierRequest true "Update supplier payload"
// @Success 200 {object} map[string]interface{} "updated supplier"
// @Failure 400 {object} map[string]interface{} "invalid id/body"
// @Failure 401 {object} map[string]interface{} "invalid tenant/auth"
// @Failure 500 {object} map[string]interface{} "internal error"
// @Router /suppliers/{id} [put]
func (h *Handler) UpdateSupplier(c echo.Context) error {
	supplierID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{
			"success": false,
			"error": map[string]interface{}{
				"code":    http.StatusBadRequest,
				"message": "invalid supplier ID",
			},
		})
	}

	tenantStr, _ := c.Get("tenant_id").(string)
	tenantID, err := uuid.Parse(tenantStr)
	if err != nil || tenantStr == "" {
		return c.JSON(http.StatusUnauthorized, map[string]interface{}{
			"success": false,
			"error": map[string]interface{}{
				"code":    http.StatusUnauthorized,
				"message": "invalid tenant",
			},
		})
	}

	var req UpdateSupplierRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{
			"success": false,
			"error": map[string]interface{}{
				"code":    http.StatusBadRequest,
				"message": "invalid request body",
			},
		})
	}
	if req.Name == "" {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{
			"success": false,
			"error": map[string]interface{}{
				"code":    http.StatusBadRequest,
				"message": "name is required",
			},
		})
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
		return c.JSON(http.StatusInternalServerError, map[string]interface{}{
			"success": false,
			"error": map[string]interface{}{
				"code":    http.StatusInternalServerError,
				"message": err.Error(),
			},
		})
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"success": true,
		"data":    supplier,
		"message": "Supplier updated successfully",
	})
}

// DeleteSupplier godoc
// @Summary Deactivate supplier
// @Description Soft deletes (deactivates) a supplier by ID
// @Tags suppliers
// @Security Bearer
// @Produce json
// @Param id path string true "Supplier ID (UUID)"
// @Success 200 {object} map[string]interface{} "success"
// @Failure 400 {object} map[string]interface{} "invalid id"
// @Failure 401 {object} map[string]interface{} "invalid tenant/auth"
// @Failure 500 {object} map[string]interface{} "internal error"
// @Router /suppliers/{id} [delete]
func (h *Handler) DeleteSupplier(c echo.Context) error {
	supplierID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{
			"success": false,
			"error": map[string]interface{}{
				"code":    http.StatusBadRequest,
				"message": "invalid supplier ID",
			},
		})
	}

	tenantStr, _ := c.Get("tenant_id").(string)
	tenantID, err := uuid.Parse(tenantStr)
	if err != nil || tenantStr == "" {
		return c.JSON(http.StatusUnauthorized, map[string]interface{}{
			"success": false,
			"error": map[string]interface{}{
				"code":    http.StatusUnauthorized,
				"message": "invalid tenant",
			},
		})
	}

	err = h.service.DeleteSupplier(c.Request().Context(), supplierID, tenantID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]interface{}{
			"success": false,
			"error": map[string]interface{}{
				"code":    http.StatusInternalServerError,
				"message": err.Error(),
			},
		})
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "Supplier deactivated successfully",
	})
}

// RegisterRoutes registers all supplier routes
// @Tags suppliers
// @Security Bearer
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