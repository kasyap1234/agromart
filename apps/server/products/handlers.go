package products

import (
	"net/http"
	"strconv"

	"agromart2/db"
	"agromart2/internal/utils"
	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
)

type ProductHandler struct {
	service *ProductService
}

// CreateProductRequest is used in Swagger annotations and request binding
type CreateProductRequest struct {
	SKU          string    `json:"sku" validate:"required"`
	Name         string    `json:"name" validate:"required"`
	Price        int       `json:"price" validate:"required"`
	Description  string    `json:"description"`
	ImageURL     string    `json:"image_url"`
	Brand        string    `json:"brand"`
	UnitID       uuid.UUID `json:"unit_id"`
	PricePerUnit int       `json:"price_per_unit"`
	GSTPercent   int       `json:"gst_percent"`
}

func NewProductHandler(service *ProductService) *ProductHandler {
	return &ProductHandler{service: service}
}

// RegisterRoutes registers product routes under provided group (expected to be /api)
// @Tags products
// @Security Bearer
func (h *ProductHandler) RegisterRoutes(g *echo.Group) {
	g.POST("/products", h.CreateProduct)
	g.GET("/products", h.ListProducts)
	g.GET("/products/search", h.SearchProducts)
	g.GET("/products/:id", h.GetProduct)
	g.PATCH("/products/:id", h.PatchProduct)
	// Units helpers
	g.GET("/units", h.ListUnits)
}

// CreateProduct godoc
// @Summary Create product
// @Description Creates a new product in the current tenant
// @Tags products
// @Security Bearer
// @Accept json
// @Produce json
// @Param payload body products.CreateProductRequest true "Create product payload"
// @Success 201 {object} map[string]interface{} "created product"
// @Failure 400 {object} map[string]interface{} "invalid body"
// @Failure 401 {object} map[string]interface{} "invalid tenant/auth"
// @Failure 500 {object} map[string]interface{} "internal error"
// @Router /products [post]
func (h *ProductHandler) CreateProduct(c echo.Context) error {
	var req CreateProductRequest

	// Dev diagnostics: capture headers and small body for binding issues
	ct := c.Request().Header.Get("Content-Type")

	if err := c.Bind(&req); err != nil {
		// attach debug header signals
		c.Response().Header().Set("X-Debug-CreateProduct", "bind-error")
		c.Response().Header().Set("X-Debug-CT", ct)
		return c.JSON(http.StatusBadRequest, map[string]any{
			"success": false,
			"error": map[string]any{
				"code":    http.StatusBadRequest,
				"message": "invalid request body",
			},
		})
	}

	// Add lightweight debug headers to introspect what was bound
	c.Response().Header().Set("X-Debug-CreateProduct", "bound")
	c.Response().Header().Set("X-Debug-CT", ct)
	c.Response().Header().Set("X-Debug-Price", strconv.Itoa(req.Price))
	if req.SKU != "" {
		if len(req.SKU) > 16 {
			c.Response().Header().Set("X-Debug-SKU", req.SKU[:16])
		} else {
			c.Response().Header().Set("X-Debug-SKU", req.SKU)
		}
	}
	if req.Name != "" {
		if len(req.Name) > 16 {
			c.Response().Header().Set("X-Debug-Name", req.Name[:16])
		} else {
			c.Response().Header().Set("X-Debug-Name", req.Name)
		}
	}

	// Basic validation without adding external deps
	if req.SKU == "" || req.Name == "" || req.Price <= 0 {
		return c.JSON(http.StatusBadRequest, map[string]any{
			"success": false,
			"error": map[string]any{
				"code":    http.StatusBadRequest,
				"message": "sku, name and positive price are required",
			},
		})
	}

	tenantVal := c.Get("tenant_id")
	tenantStr, _ := tenantVal.(string)
	tenantID, err := uuid.Parse(tenantStr)
	if err != nil || tenantStr == "" {
		return c.JSON(http.StatusUnauthorized, map[string]any{
			"success": false,
			"error": map[string]any{
				"code":    http.StatusUnauthorized,
				"message": "invalid tenant",
			},
		})
	}

	// Add TenantID prefix as debug header to verify middleware propagation
	if tenantStr != "" {
		if len(tenantStr) > 8 {
			c.Response().Header().Set("X-Debug-Tenant", tenantStr[:8])
		} else {
			c.Response().Header().Set("X-Debug-Tenant", tenantStr)
		}
	}

	product, err := h.service.CreateProduct(c.Request().Context(), CreateProductParams{
		TenantID:     tenantID,
		SKU:          req.SKU,
		Name:         req.Name,
		Price:        req.Price,
		Description:  req.Description,
		ImageURL:     req.ImageURL,
		Brand:        req.Brand,
		UnitID:       req.UnitID,
		PricePerUnit: req.PricePerUnit,
		GSTPercent:   req.GSTPercent,
	})
	if err != nil {
		// record price observed at service entry as well
		c.Response().Header().Set("X-Debug-Price-At-Service", strconv.Itoa(req.Price))
		return c.JSON(http.StatusInternalServerError, map[string]any{
			"success": false,
			"error": map[string]any{
				"code":    http.StatusInternalServerError,
				"message": err.Error(),
			},
		})
	}

	return c.JSON(http.StatusCreated, map[string]any{
		"success": true,
		"data":    product,
		"message": "Product created successfully",
	})
}

// GetProduct godoc
// @Summary Get product
// @Description Returns a product by ID
// @Tags products
// @Security Bearer
// @Produce json
// @Param id path string true "Product ID (UUID)"
// @Success 200 {object} map[string]interface{} "product"
// @Failure 400 {object} map[string]interface{} "invalid id"
// @Failure 401 {object} map[string]interface{} "invalid tenant/auth"
// @Failure 404 {object} map[string]interface{} "not found"
// @Router /products/{id} [get]
func (h *ProductHandler) GetProduct(c echo.Context) error {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]any{
			"success": false,
			"error": map[string]any{
				"code":    http.StatusBadRequest,
				"message": "invalid product ID",
			},
		})
	}
	tenantStr, _ := c.Get("tenant_id").(string)
	tenantID, err := uuid.Parse(tenantStr)
	if err != nil || tenantStr == "" {
		return c.JSON(http.StatusUnauthorized, map[string]any{
			"success": false,
			"error": map[string]any{
				"code":    http.StatusUnauthorized,
				"message": "invalid tenant",
			},
		})
	}

	product, err := h.service.GetProductByID(c.Request().Context(), id, tenantID)
	if err != nil {
		return c.JSON(http.StatusNotFound, map[string]any{
			"success": false,
			"error": map[string]any{
				"code":    http.StatusNotFound,
				"message": "product not found",
			},
		})
	}
	return c.JSON(http.StatusOK, map[string]any{
		"success": true,
		"data":    product,
	})
}

// ListProducts godoc
// @Summary List products
// @Description Lists products with pagination
// @Tags products
// @Security Bearer
// @Produce json
// @Param page query int false "Page number" minimum(1)
// @Param limit query int false "Items per page (1-100)" minimum(1) maximum(100)
// @Success 200 {object} map[string]interface{} "items and pagination"
// @Failure 401 {object} map[string]interface{} "invalid tenant/auth"
// @Failure 500 {object} map[string]interface{} "internal error"
// @Router /products [get]
func (h *ProductHandler) ListProducts(c echo.Context) error {
	tenantStr, _ := c.Get("tenant_id").(string)
	tenantID, err := uuid.Parse(tenantStr)
	if err != nil || tenantStr == "" {
		return c.JSON(http.StatusUnauthorized, map[string]any{
			"success": false,
			"error": map[string]any{
				"code":    http.StatusUnauthorized,
				"message": "invalid tenant",
			},
		})
	}

	page, _ := strconv.Atoi(c.QueryParam("page"))
	if page < 1 {
		page = 1
	}
	limit, _ := strconv.Atoi(c.QueryParam("limit"))
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit

	items, err := h.service.ListProducts(c.Request().Context(), tenantID, limit, offset)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]any{
			"success": false,
			"error": map[string]any{
				"code":    http.StatusInternalServerError,
				"message": err.Error(),
			},
		})
	}

	total, err := h.service.CountProducts(c.Request().Context(), tenantID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]any{
			"success": false,
			"error": map[string]any{
				"code":    http.StatusInternalServerError,
				"message": err.Error(),
			},
		})
	}

	// convert []db.Product to []any for consistent JSON payload
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

// SearchProducts godoc
// @Summary Search products
// @Description Searches products by name or SKU
// @Tags products
// @Security Bearer
// @Produce json
// @Param q query string true "Search query"
// @Param page query int false "Page number" minimum(1)
// @Param limit query int false "Items per page (1-100)" minimum(1) maximum(100)
// @Success 200 {object} map[string]interface{} "items and query"
// @Failure 400 {object} map[string]interface{} "missing query"
// @Failure 401 {object} map[string]interface{} "invalid tenant/auth"
// @Failure 500 {object} map[string]interface{} "internal error"
// @Router /products/search [get]
func (h *ProductHandler) SearchProducts(c echo.Context) error {
	tenantStr, _ := c.Get("tenant_id").(string)
	tenantID, err := uuid.Parse(tenantStr)
	if err != nil || tenantStr == "" {
		return c.JSON(http.StatusUnauthorized, map[string]any{
			"success": false,
			"error": map[string]any{
				"code":    http.StatusUnauthorized,
				"message": "invalid tenant",
			},
		})
	}
	q := c.QueryParam("q")
	if q == "" {
		return c.JSON(http.StatusBadRequest, map[string]any{
			"success": false,
			"error": map[string]any{
				"code":    http.StatusBadRequest,
				"message": "search query is required",
			},
		})
	}
	page, _ := strconv.Atoi(c.QueryParam("page"))
	if page < 1 {
		page = 1
	}
	limit, _ := strconv.Atoi(c.QueryParam("limit"))
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit

	items, err := h.service.SearchProducts(c.Request().Context(), tenantID, q, limit, offset)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]any{
			"success": false,
			"error": map[string]any{
				"code":    http.StatusInternalServerError,
				"message": err.Error(),
			},
		})
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

// PatchProduct godoc
// @Summary Update product
// @Description Applies partial update to a product
// @Tags products
// @Security Bearer
// @Accept json
// @Produce json
// @Param id path string true "Product ID (UUID)"
// @Param payload body products.ProductInputRequest true "Patch payload"
// @Success 200 {object} map[string]interface{} "success"
// @Failure 400 {object} map[string]interface{} "invalid id/body"
// @Failure 401 {object} map[string]interface{} "invalid tenant/auth"
// @Failure 500 {object} map[string]interface{} "internal error"
// @Router /products/{id} [patch]
func (h *ProductHandler) PatchProduct(c echo.Context) error {
	productID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]any{
			"success": false,
			"error": map[string]any{
				"code":    http.StatusBadRequest,
				"message": "invalid product ID",
			},
		})
	}
	tenantStr, _ := c.Get("tenant_id").(string)
	tenantID, err := uuid.Parse(tenantStr)
	if err != nil || tenantStr == "" {
		return c.JSON(http.StatusUnauthorized, map[string]any{
			"success": false,
			"error": map[string]any{
				"code":    http.StatusUnauthorized,
				"message": "invalid tenant",
			},
		})
	}

	var req ProductInputRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]any{
			"success": false,
			"error": map[string]any{
				"code":    http.StatusBadRequest,
				"message": "invalid request body",
			},
		})
	}

	if err := h.service.PatchProduct(c.Request().Context(), tenantID, productID, req); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]any{
			"success": false,
			"error": map[string]any{
				"code":    http.StatusInternalServerError,
				"message": err.Error(),
			},
		})
	}

	return c.JSON(http.StatusOK, map[string]any{
		"success": true,
		"message": "Product updated successfully",
	})
}

// ListUnits godoc
// @Summary List units
// @Description Lists units with pagination
// @Tags products
// @Security Bearer
// @Produce json
// @Param page query int false "Page number" minimum(1)
// @Param limit query int false "Items per page (1-100)" minimum(1) maximum(100)
// @Success 200 {object} map[string]interface{} "units"
// @Failure 401 {object} map[string]interface{} "invalid tenant/auth"
// @Failure 500 {object} map[string]interface{} "internal error"
// @Router /units [get]
func (h *ProductHandler) ListUnits(c echo.Context) error {
	tenantStr, _ := c.Get("tenant_id").(string)
	tenantID, err := uuid.Parse(tenantStr)
	if err != nil || tenantStr == "" {
		return c.JSON(http.StatusUnauthorized, map[string]any{
			"success": false,
			"error": map[string]any{
				"code":    http.StatusUnauthorized,
				"message": "invalid tenant",
			},
		})
	}

	page, _ := strconv.Atoi(c.QueryParam("page"))
	if page < 1 {
		page = 1
	}
	limit, _ := strconv.Atoi(c.QueryParam("limit"))
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit

	units, err := h.service.ListUnits(c.Request().Context(), tenantID, limit, offset)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]any{
			"success": false,
			"error": map[string]any{
				"code":    http.StatusInternalServerError,
				"message": err.Error(),
			},
		})
	}
	out := make([]any, 0, len(units))
	for _, u := range units {
		out = append(out, u)
	}
	return c.JSON(http.StatusOK, map[string]any{
		"success": true,
		"data":    out,
	})
}

// compile-time usage to avoid unused import errors for db and utils when methods evolve
var _ = db.Product{}
var _ = utils.P
