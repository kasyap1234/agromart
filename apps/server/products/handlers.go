package products

import (
	"net/http"
	"strconv"

	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
)

type Handler struct {
	service *ProductService
}

func NewHandler(service *ProductService) *Handler {
	return &Handler{service: service}
}

// CreateProduct creates a new product
func (h *Handler) CreateProduct(c echo.Context) error {
	var req CreateProductRequest
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

	return c.JSON(http.StatusCreated, map[string]interface{}{
		"success": true,
		"data":    product,
		"message": "Product created successfully",
	})
}

// GetProduct retrieves a product by ID
func (h *Handler) GetProduct(c echo.Context) error {
	productID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid product ID")
	}

	tenantID, err := uuid.Parse(c.Get("tenant_id").(string))
	if err != nil {
		return echo.NewHTTPError(http.StatusUnauthorized, "invalid tenant")
	}

	product, err := h.service.GetProductByID(c.Request().Context(), productID, tenantID)
	if err != nil {
		return echo.NewHTTPError(http.StatusNotFound, "product not found")
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"success": true,
		"data":    product,
	})
}

// ListProducts lists all products with pagination
func (h *Handler) ListProducts(c echo.Context) error {
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

	offset := (page - 1) * limit

	products, err := h.service.ListProducts(c.Request().Context(), tenantID, limit, offset)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	// Get total count
	total, err := h.service.CountProducts(c.Request().Context(), tenantID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"success": true,
		"data":    products,
		"pagination": map[string]interface{}{
			"page":  page,
			"limit": limit,
			"total": total,
			"pages": (total + int64(limit) - 1) / int64(limit),
		},
	})
}

// SearchProducts searches products by name or SKU
func (h *Handler) SearchProducts(c echo.Context) error {
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

	offset := (page - 1) * limit

	products, err := h.service.SearchProducts(c.Request().Context(), tenantID, "%"+query+"%", limit, offset)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"success": true,
		"data":    products,
		"query":   query,
	})
}

// UpdateProduct updates a product
func (h *Handler) UpdateProduct(c echo.Context) error {
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

	err = h.service.PatchProduct(c.Request().Context(), tenantID, productID, req)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "Product updated successfully",
	})
}

// CreateUnit creates a new unit
func (h *Handler) CreateUnit(c echo.Context) error {
	var req CreateUnitRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid request body")
	}

	tenantID, err := uuid.Parse(c.Get("tenant_id").(string))
	if err != nil {
		return echo.NewHTTPError(http.StatusUnauthorized, "invalid tenant")
	}

	unit, err := h.service.CreateUnit(c.Request().Context(), uuid.New(), tenantID, req.Name, req.Abbreviation)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	return c.JSON(http.StatusCreated, map[string]interface{}{
		"success": true,
		"data":    unit,
		"message": "Unit created successfully",
	})
}

// ListUnits lists all units
func (h *Handler) ListUnits(c echo.Context) error {
	tenantID, err := uuid.Parse(c.Get("tenant_id").(string))
	if err != nil {
		return echo.NewHTTPError(http.StatusUnauthorized, "invalid tenant")
	}

	units, err := h.service.ListUnits(c.Request().Context(), tenantID, 100, 0)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"success": true,
		"data":    units,
	})
}

// RegisterRoutes registers all product routes
func (h *Handler) RegisterRoutes(g *echo.Group) {
	g.POST("/products", h.CreateProduct)
	g.GET("/products", h.ListProducts)
	g.GET("/products/search", h.SearchProducts)
	g.GET("/products/:id", h.GetProduct)
	g.PUT("/products/:id", h.UpdateProduct)
	
	g.POST("/units", h.CreateUnit)
	g.GET("/units", h.ListUnits)
}

// Request/Response types
type CreateProductRequest struct {
	SKU          string    `json:"sku" validate:"required"`
	Name         string    `json:"name" validate:"required"`
	Price        int       `json:"price" validate:"required,min=0"`
	Description  string    `json:"description"`
	ImageURL     string    `json:"image_url"`
	Brand        string    `json:"brand"`
	UnitID       uuid.UUID `json:"unit_id" validate:"required"`
	PricePerUnit int       `json:"price_per_unit" validate:"required,min=0"`
	GSTPercent   int       `json:"gst_percent" validate:"min=0,max=100"`
}

type CreateUnitRequest struct {
	Name         string `json:"name" validate:"required"`
	Abbreviation string `json:"abbreviation" validate:"required"`
}
