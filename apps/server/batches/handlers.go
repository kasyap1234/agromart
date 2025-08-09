package batches

import (
	"net/http"
	"strconv"
	"time"

	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

// CreateBatchRequest represents the request body for creating a batch
type CreateBatchRequest struct {
	ProductID   uuid.UUID `json:"product_id" validate:"required"`
	BatchNumber string    `json:"batch_number" validate:"required"`
	ExpiryDate  time.Time `json:"expiry_date" validate:"required"`
	Cost        int       `json:"cost" validate:"required,min=0"`
}

// UpdateBatchRequest represents the request body for updating a batch
type UpdateBatchRequest struct {
	BatchNumber string    `json:"batch_number" validate:"required"`
	ExpiryDate  time.Time `json:"expiry_date" validate:"required"`
	Cost        int       `json:"cost" validate:"required,min=0"`
}

// CreateBatch creates a new batch
func (h *Handler) CreateBatch(c echo.Context) error {
	var req CreateBatchRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid request body")
	}

	tenantID, err := uuid.Parse(c.Get("tenant_id").(string))
	if err != nil {
		return echo.NewHTTPError(http.StatusUnauthorized, "invalid tenant")
	}

	batch, err := h.service.CreateBatch(c.Request().Context(), tenantID, req.ProductID, req.BatchNumber, req.ExpiryDate, req.Cost)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	return c.JSON(http.StatusCreated, map[string]interface{}{
		"success": true,
		"data":    batch,
		"message": "Batch created successfully",
	})
}

// GetBatch retrieves a batch by ID
func (h *Handler) GetBatch(c echo.Context) error {
	batchID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid batch ID")
	}

	tenantID, err := uuid.Parse(c.Get("tenant_id").(string))
	if err != nil {
		return echo.NewHTTPError(http.StatusUnauthorized, "invalid tenant")
	}

	batch, err := h.service.GetBatchByID(c.Request().Context(), batchID, tenantID)
	if err != nil {
		return echo.NewHTTPError(http.StatusNotFound, "batch not found")
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"success": true,
		"data":    batch,
	})
}

// UpdateBatch updates a batch
func (h *Handler) UpdateBatch(c echo.Context) error {
	batchID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid batch ID")
	}

	var req UpdateBatchRequest
	if bindErr := c.Bind(&req); bindErr != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid request body")
	}

	tenantID, err := uuid.Parse(c.Get("tenant_id").(string))
	if err != nil {
		return echo.NewHTTPError(http.StatusUnauthorized, "invalid tenant")
	}

	batch, err := h.service.UpdateBatch(c.Request().Context(), tenantID, batchID, req.BatchNumber, req.ExpiryDate, req.Cost)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"success": true,
		"data":    batch,
		"message": "Batch updated successfully",
	})
}

// ListBatches lists batches with pagination
func (h *Handler) ListBatches(c echo.Context) error {
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

	batches, err := h.service.ListBatches(c.Request().Context(), tenantID, int32(limit), offset)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"success": true,
		"data":    batches,
		"pagination": map[string]interface{}{
			"page":  page,
			"limit": limit,
		},
	})
}

// RegisterRoutes registers all batch routes
func (h *Handler) RegisterRoutes(g *echo.Group) {
	g.POST("/batches", h.CreateBatch)
	g.GET("/batches", h.ListBatches)
	g.GET("/batches/:id", h.GetBatch)
	g.PUT("/batches/:id", h.UpdateBatch)
}

