package inventory

import (
	"net/http"
	"strconv"
	"time"

	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
)

type Handler struct {
	service *InventoryService
}

func NewHandler(service *InventoryService) *Handler {
	return &Handler{service: service}
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

// AddInventory adds quantity to inventory
func (h *Handler) AddInventory(c echo.Context) error {
	var req AddInventoryRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid request body")
	}

	tenantID, err := uuid.Parse(c.Get("tenant_id").(string))
	if err != nil {
		return echo.NewHTTPError(http.StatusUnauthorized, "invalid tenant")
	}

	err = h.service.AddInventoryQuantity(c.Request().Context(), tenantID, req.ProductID, req.BatchID, req.Quantity)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	// Log the inventory change
	userID := c.Get("user_id").(string)
	refID, _ := uuid.Parse(userID)
	
	err = h.service.CreateInventoryLog(c.Request().Context(), tenantID, req.ProductID, req.BatchID, refID, "ADD", req.Quantity, req.Notes)
	if err != nil {
		// Log but don't fail the request
		// In production, you might want to use a proper logging system
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "Inventory updated successfully",
	})
}

// ReduceInventory reduces quantity from inventory
func (h *Handler) ReduceInventory(c echo.Context) error {
	var req ReduceInventoryRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid request body")
	}

	tenantID, err := uuid.Parse(c.Get("tenant_id").(string))
	if err != nil {
		return echo.NewHTTPError(http.StatusUnauthorized, "invalid tenant")
	}

	err = h.service.ReduceInventoryQuantity(c.Request().Context(), tenantID, req.ProductID, req.BatchID, req.Quantity)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	// Log the inventory change
	userID := c.Get("user_id").(string)
	refID, _ := uuid.Parse(userID)
	
	err = h.service.CreateInventoryLog(c.Request().Context(), tenantID, req.ProductID, req.BatchID, refID, "REDUCE", req.Quantity, req.Notes)
	if err != nil {
		// Log but don't fail the request
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "Inventory reduced successfully",
	})
}

// GetInventoryByProduct gets inventory details for a specific product
func (h *Handler) GetInventoryByProduct(c echo.Context) error {
	productID, err := uuid.Parse(c.Param("productId"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid product ID")
	}

	tenantID, err := uuid.Parse(c.Get("tenant_id").(string))
	if err != nil {
		return echo.NewHTTPError(http.StatusUnauthorized, "invalid tenant")
	}

	inventory, err := h.service.GetProductInventoryDetails(c.Request().Context(), tenantID, productID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"success": true,
		"data":    inventory,
	})
}

// ListAllInventory lists all inventory with pagination
func (h *Handler) ListAllInventory(c echo.Context) error {
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

	inventory, err := h.service.ListAllInventory(c.Request().Context(), tenantID, int32(limit), offset)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"success": true,
		"data":    inventory,
		"pagination": map[string]interface{}{
			"page":  page,
			"limit": limit,
		},
	})
}

// GetLowStockReport gets products with low stock
func (h *Handler) GetLowStockReport(c echo.Context) error {
	tenantID, err := uuid.Parse(c.Get("tenant_id").(string))
	if err != nil {
		return echo.NewHTTPError(http.StatusUnauthorized, "invalid tenant")
	}

	threshold, _ := strconv.Atoi(c.QueryParam("threshold"))
	if threshold <= 0 {
		threshold = 10 // Default threshold
	}

	report, err := h.service.GetLowStockReport(c.Request().Context(), tenantID, threshold)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"success":   true,
		"data":      report,
		"threshold": threshold,
	})
}

// GetInventoryLogs gets inventory transaction logs
func (h *Handler) GetInventoryLogs(c echo.Context) error {
	tenantID, err := uuid.Parse(c.Get("tenant_id").(string))
	if err != nil {
		return echo.NewHTTPError(http.StatusUnauthorized, "invalid tenant")
	}

	productIDStr := c.QueryParam("product_id")
	batchIDStr := c.QueryParam("batch_id")

	page, _ := strconv.Atoi(c.QueryParam("page"))
	if page < 1 {
		page = 1
	}

	limit, _ := strconv.Atoi(c.QueryParam("limit"))
	if limit < 1 || limit > 100 {
		limit = 20
	}

	offset := int32((page - 1) * limit)

	var logs []interface{}

	if productIDStr != "" {
		productID, err := uuid.Parse(productIDStr)
		if err != nil {
			return echo.NewHTTPError(http.StatusBadRequest, "invalid product ID")
		}

		productLogs, err := h.service.GetInventoryLogByProduct(c.Request().Context(), tenantID, productID, int32(limit), offset)
		if err != nil {
			return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
		}

		for _, log := range productLogs {
			logs = append(logs, log)
		}
	} else if batchIDStr != "" {
		batchID, err := uuid.Parse(batchIDStr)
		if err != nil {
			return echo.NewHTTPError(http.StatusBadRequest, "invalid batch ID")
		}

		batchLogs, err := h.service.GetInventoryLogByBatch(c.Request().Context(), tenantID, batchID, int32(limit), offset)
		if err != nil {
			return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
		}

		for _, log := range batchLogs {
			logs = append(logs, log)
		}
	} else {
		return echo.NewHTTPError(http.StatusBadRequest, "either product_id or batch_id is required")
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"success": true,
		"data":    logs,
		"pagination": map[string]interface{}{
			"page":  page,
			"limit": limit,
		},
	})
}

// RegisterRoutes registers all inventory routes
func (h *Handler) RegisterRoutes(g *echo.Group) {
	g.POST("/batches", h.CreateBatch)
	g.GET("/batches/:id", h.GetBatch)
	
	g.POST("/inventory/add", h.AddInventory)
	g.POST("/inventory/reduce", h.ReduceInventory)
	g.GET("/inventory", h.ListAllInventory)
	g.GET("/inventory/product/:productId", h.GetInventoryByProduct)
	g.GET("/inventory/logs", h.GetInventoryLogs)
	
	g.GET("/reports/low-stock", h.GetLowStockReport)
}

// Request types
type CreateBatchRequest struct {
	ProductID   uuid.UUID `json:"product_id" validate:"required"`
	BatchNumber string    `json:"batch_number" validate:"required"`
	ExpiryDate  time.Time `json:"expiry_date" validate:"required"`
	Cost        int       `json:"cost" validate:"required,min=0"`
}

type AddInventoryRequest struct {
	ProductID uuid.UUID `json:"product_id" validate:"required"`
	BatchID   uuid.UUID `json:"batch_id" validate:"required"`
	Quantity  int       `json:"quantity" validate:"required,min=1"`
	Notes     string    `json:"notes"`
}

type ReduceInventoryRequest struct {
	ProductID uuid.UUID `json:"product_id" validate:"required"`
	BatchID   uuid.UUID `json:"batch_id" validate:"required"`
	Quantity  int       `json:"quantity" validate:"required,min=1"`
	Notes     string    `json:"notes"`
}
