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

func NewProductHandler(service *ProductService) *ProductHandler {
	return &ProductHandler{service: service}
}

// RegisterRoutes registers product routes under provided group (expected to be /api)
func (h *ProductHandler) RegisterRoutes(g *echo.Group) {
	g.POST("/products", h.CreateProduct)
	g.GET("/products", h.ListProducts)
	g.GET("/products/search", h.SearchProducts)
	g.GET("/products/:id", h.GetProduct)
	g.PATCH("/products/:id", h.PatchProduct)
	// Units helpers
	g.GET("/units", h.ListUnits)
}

// CreateProduct creates a new product
func (h *ProductHandler) CreateProduct(c echo.Context) error {
	var req struct {
		SKU          string     `json:"sku" validate:"required"`
		Name         string     `json:"name" validate:"required"`
		Price        int        `json:"price" validate:"required"`
		Description  string     `json:"description"`
		ImageURL     string     `json:"image_url"`
		Brand        string     `json:"brand"`
		UnitID       uuid.UUID  `json:"unit_id"`
		PricePerUnit int        `json:"price_per_unit"`
		GSTPercent   int        `json:"gst_percent"`
	}
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid request body")
	}

	tenantID, err := uuid.Parse(c.Get("tenant_id").(string))
	if err != nil {
		return echo.NewHTTPError(http.StatusUnauthorized, "invalid tenant")
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
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	return c.JSON(http.StatusCreated, map[string]any{
		"success": true,
		"data":    product,
		"message": "Product created successfully",
	})
}

// GetProduct returns product by id
func (h *ProductHandler) GetProduct(c echo.Context) error {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid product ID")
	}
	tenantID, err := uuid.Parse(c.Get("tenant_id").(string))
	if err != nil {
		return echo.NewHTTPError(http.StatusUnauthorized, "invalid tenant")
	}

	product, err := h.service.GetProductByID(c.Request().Context(), id, tenantID)
	if err != nil {
		return echo.NewHTTPError(http.StatusNotFound, "product not found")
	}
	return c.JSON(http.StatusOK, map[string]any{
		"success": true,
		"data":    product,
	})
}

// ListProducts lists products with pagination
func (h *ProductHandler) ListProducts(c echo.Context) error {
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
	offset := (page - 1) * limit

	items, err := h.service.ListProducts(c.Request().Context(), tenantID, limit, offset)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	total, err := h.service.CountProducts(c.Request().Context(), tenantID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
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

// SearchProducts searches by name or sku (uses q param)
func (h *ProductHandler) SearchProducts(c echo.Context) error {
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
	offset := (page - 1) * limit

	items, err := h.service.SearchProducts(c.Request().Context(), tenantID, q, limit, offset)
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

// PatchProduct applies partial update based on allowed fields
func (h *ProductHandler) PatchProduct(c echo.Context) error {
	productID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid product ID")
	}
	tenantID, err := uuid.Parse(c.Get("tenant_id").(string))
	if err != nil {
		return echo.NewHTTPError(http.StatusUnauthorized, "invalid tenant")
	}

	var req ProductInputRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid request body")
	}

	if err := h.service.PatchProduct(c.Request().Context(), tenantID, productID, req); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	return c.JSON(http.StatusOK, map[string]any{
		"success": true,
		"message": "Product updated successfully",
	})
}

// ListUnits returns units with pagination
func (h *ProductHandler) ListUnits(c echo.Context) error {
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
	offset := (page - 1) * limit

	units, err := h.service.ListUnits(c.Request().Context(), tenantID, limit, offset)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
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
