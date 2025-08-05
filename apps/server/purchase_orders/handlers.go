package purchase_orders

import (
	"agromart2/internal/validation"
	"net/http"
	"strconv"
	"time"

	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
)

type Handler struct {
	service *PurchaseOrderService
}

func NewHandler(service *PurchaseOrderService) *Handler {
	return &Handler{service: service}
}

// CreatePurchaseOrder creates a new purchase order
func (h *Handler) CreatePurchaseOrder(c echo.Context) error {
	var req CreatePurchaseOrderRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid request body")
	}

	if err := validation.Validate(req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	tenantID, err := uuid.Parse(c.Get("tenant_id").(string))
	if err != nil {
		return echo.NewHTTPError(http.StatusUnauthorized, "invalid tenant")
	}

	userID, err := uuid.Parse(c.Get("user_id").(string))
	if err != nil {
		return echo.NewHTTPError(http.StatusUnauthorized, "invalid user")
	}

	// Convert request items to service params
	var items []CreatePurchaseOrderItemParams
	for _, item := range req.Items {
		serviceItem := CreatePurchaseOrderItemParams{
			ProductID:       item.ProductID,
			QuantityOrdered: item.QuantityOrdered,
			UnitCost:        item.UnitCost,
			TotalCost:       item.TotalCost,
			TaxPercent:      item.TaxPercent,
			DiscountPercent: item.DiscountPercent,
			Notes:           item.Notes,
		}
		if item.BatchID != nil {
			serviceItem.BatchID = item.BatchID
		}
		items = append(items, serviceItem)
	}

	params := CreatePurchaseOrderParams{
		TenantID:        tenantID,
		PONumber:        req.PONumber,
		SupplierID:      req.SupplierID,
		TotalAmount:     req.TotalAmount,
		TaxAmount:       req.TaxAmount,
		DiscountAmount:  req.DiscountAmount,
		FinalAmount:     req.FinalAmount,
		Notes:           req.Notes,
		CreatedBy:       userID,
		Items:           items,
	}

	if req.LocationID != nil {
		params.LocationID = req.LocationID
	}

	if req.ExpectedDeliveryDate != nil {
		params.ExpectedDeliveryDate = req.ExpectedDeliveryDate
	}

	po, err := h.service.CreatePurchaseOrder(c.Request().Context(), params)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	return c.JSON(http.StatusCreated, map[string]interface{}{
		"success": true,
		"data":    po,
		"message": "Purchase order created successfully",
	})
}

// GetPurchaseOrder retrieves a purchase order by ID
func (h *Handler) GetPurchaseOrder(c echo.Context) error {
	poID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid purchase order ID")
	}

	tenantID, err := uuid.Parse(c.Get("tenant_id").(string))
	if err != nil {
		return echo.NewHTTPError(http.StatusUnauthorized, "invalid tenant")
	}

	po, err := h.service.GetPurchaseOrder(c.Request().Context(), poID, tenantID)
	if err != nil {
		return echo.NewHTTPError(http.StatusNotFound, "purchase order not found")
	}

	// Get items
	items, err := h.service.GetPurchaseOrderItems(c.Request().Context(), poID, tenantID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to get purchase order items")
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"success": true,
		"data": map[string]interface{}{
			"purchase_order": po,
			"items":          items,
		},
	})
}

// ListPurchaseOrders lists purchase orders with filters
func (h *Handler) ListPurchaseOrders(c echo.Context) error {
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

	// Check filters
	status := c.QueryParam("status")
	supplierIDStr := c.QueryParam("supplier_id")

	var orders []interface{}

	if status != "" {
		statusOrders, err := h.service.ListPurchaseOrdersByStatus(c.Request().Context(), tenantID, status, int32(limit), offset)
		if err != nil {
			return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
		}
		for _, order := range statusOrders {
			orders = append(orders, order)
		}
	} else if supplierIDStr != "" {
		supplierID, err := uuid.Parse(supplierIDStr)
		if err != nil {
			return echo.NewHTTPError(http.StatusBadRequest, "invalid supplier ID")
		}

		supplierOrders, err := h.service.ListPurchaseOrdersBySupplier(c.Request().Context(), tenantID, supplierID, int32(limit), offset)
		if err != nil {
			return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
		}
		for _, order := range supplierOrders {
			orders = append(orders, order)
		}
	} else {
		// Default: list by status "PENDING"
		statusOrders, err := h.service.ListPurchaseOrdersByStatus(c.Request().Context(), tenantID, "PENDING", int32(limit), offset)
		if err != nil {
			return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
		}
		for _, order := range statusOrders {
			orders = append(orders, order)
		}
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"success": true,
		"data":    orders,
		"pagination": map[string]interface{}{
			"page":  page,
			"limit": limit,
		},
	})
}

// UpdatePurchaseOrderStatus updates the status of a purchase order
func (h *Handler) UpdatePurchaseOrderStatus(c echo.Context) error {
	poID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid purchase order ID")
	}

	tenantID, err := uuid.Parse(c.Get("tenant_id").(string))
	if err != nil {
		return echo.NewHTTPError(http.StatusUnauthorized, "invalid tenant")
	}

	userID, err := uuid.Parse(c.Get("user_id").(string))
	if err != nil {
		return echo.NewHTTPError(http.StatusUnauthorized, "invalid user")
	}

	var req UpdateStatusRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid request body")
	}

	if err := validation.Validate(req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	err = h.service.UpdatePurchaseOrderStatus(c.Request().Context(), UpdatePurchaseOrderStatusParams{
		ID:         poID,
		TenantID:   tenantID,
		Status:     req.Status,
		ApprovedBy: userID,
	})
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "Purchase order status updated successfully",
	})
}

// ReceivePurchaseOrder processes receiving of a purchase order
func (h *Handler) ReceivePurchaseOrder(c echo.Context) error {
	poID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid purchase order ID")
	}

	tenantID, err := uuid.Parse(c.Get("tenant_id").(string))
	if err != nil {
		return echo.NewHTTPError(http.StatusUnauthorized, "invalid tenant")
	}

	userID, err := uuid.Parse(c.Get("user_id").(string))
	if err != nil {
		return echo.NewHTTPError(http.StatusUnauthorized, "invalid user")
	}

	var req ReceivePurchaseOrderRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid request body")
	}

	if err := validation.Validate(req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	// Convert request items to service params
	var items []ReceiveItemParams
	for _, item := range req.Items {
		serviceItem := ReceiveItemParams{
			ItemID:           item.ItemID,
			ProductID:        item.ProductID,
			QuantityReceived: item.QuantityReceived,
		}
		if item.BatchID != nil {
			serviceItem.BatchID = item.BatchID
		}
		items = append(items, serviceItem)
	}

	err = h.service.ReceivePurchaseOrder(c.Request().Context(), poID, tenantID, userID, items)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "Purchase order received successfully",
	})
}

// GetProductMovementReport gets product movement report
func (h *Handler) GetProductMovementReport(c echo.Context) error {
	tenantID, err := uuid.Parse(c.Get("tenant_id").(string))
	if err != nil {
		return echo.NewHTTPError(http.StatusUnauthorized, "invalid tenant")
	}

	report, err := h.service.GetProductMovementReport(c.Request().Context(), tenantID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"success": true,
		"data":    report,
	})
}

// GetSupplierPurchaseSummary gets supplier purchase summary
func (h *Handler) GetSupplierPurchaseSummary(c echo.Context) error {
	tenantID, err := uuid.Parse(c.Get("tenant_id").(string))
	if err != nil {
		return echo.NewHTTPError(http.StatusUnauthorized, "invalid tenant")
	}

	summary, err := h.service.GetSupplierPurchaseSummary(c.Request().Context(), tenantID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"success": true,
		"data":    summary,
	})
}

// RegisterRoutes registers all purchase order routes
func (h *Handler) RegisterRoutes(g *echo.Group) {
	g.POST("/purchase-orders", h.CreatePurchaseOrder)
	g.GET("/purchase-orders", h.ListPurchaseOrders)
	g.GET("/purchase-orders/:id", h.GetPurchaseOrder)
	g.PUT("/purchase-orders/:id/status", h.UpdatePurchaseOrderStatus)
	g.POST("/purchase-orders/:id/receive", h.ReceivePurchaseOrder)

	// Reports JSON
	g.GET("/reports/product-movement", h.GetProductMovementReport)
	g.GET("/reports/supplier-purchase-summary", h.GetSupplierPurchaseSummary)

	// CSV Export endpoints
	h.RegisterExportRoutes(g)
}

// Request/Response types
type CreatePurchaseOrderRequest struct {
	PONumber             string                              `json:"po_number" validate:"required"`
	SupplierID           uuid.UUID                           `json:"supplier_id" validate:"required"`
	LocationID           *uuid.UUID                          `json:"location_id"`
	ExpectedDeliveryDate *time.Time                          `json:"expected_delivery_date"`
	TotalAmount          int                                 `json:"total_amount" validate:"required,min=0"`
	TaxAmount            int                                 `json:"tax_amount" validate:"min=0"`
	DiscountAmount       int                                 `json:"discount_amount" validate:"min=0"`
	FinalAmount          int                                 `json:"final_amount" validate:"required,min=0"`
	Notes                string                              `json:"notes"`
	Items                []CreatePurchaseOrderItemRequest    `json:"items" validate:"required,min=1"`
}

type CreatePurchaseOrderItemRequest struct {
	ProductID       uuid.UUID  `json:"product_id" validate:"required"`
	BatchID         *uuid.UUID `json:"batch_id"`
	QuantityOrdered int        `json:"quantity_ordered" validate:"required,min=1"`
	UnitCost        int        `json:"unit_cost" validate:"required,min=0"`
	TotalCost       int        `json:"total_cost" validate:"required,min=0"`
	TaxPercent      int        `json:"tax_percent" validate:"min=0,max=100"`
	DiscountPercent int        `json:"discount_percent" validate:"min=0,max=100"`
	Notes           string     `json:"notes"`
}

type UpdateStatusRequest struct {
	Status string `json:"status" validate:"required,oneof=PENDING APPROVED ORDERED RECEIVED CANCELLED"`
}

type ReceivePurchaseOrderRequest struct {
	Items []ReceiveItemRequest `json:"items" validate:"required,min=1"`
}

type ReceiveItemRequest struct {
	ItemID           uuid.UUID  `json:"item_id" validate:"required"`
	ProductID        uuid.UUID  `json:"product_id" validate:"required"`
	BatchID          *uuid.UUID `json:"batch_id"`
	QuantityReceived int        `json:"quantity_received" validate:"required,min=1"`
}
