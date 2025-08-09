package sales

import (
	"encoding/csv"
	"net/http"
	"strconv"
	"time"

	"agromart2/internal/auth"
	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
)

type Handler struct {
	svc *Service
}

func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

// RegisterRoutes registers sales endpoints
// @Tags sales
// @Security Bearer
func (h *Handler) RegisterRoutes(g *echo.Group) {
	salesGroup := g.Group("/sales")
	
	// Sales orders CRUD
	salesGroup.POST("/orders", h.CreateSalesOrder)
	salesGroup.GET("/orders", h.ListSalesOrders)
	salesGroup.GET("/orders/:id", h.GetSalesOrder)
	salesGroup.PUT("/orders/:id/status", h.UpdateSalesOrderStatus)
	salesGroup.POST("/orders/:id/ship", h.ShipSalesOrderItem)
	
	// CSV export endpoint: /api/sales/orders.csv
	// Uses CanExport RBAC helper (admin/manager)
	salesGroup.GET("/orders.csv", h.exportSalesOrdersCSV)
}

// exportSalesOrdersCSV godoc
// @Summary Export sales orders CSV
// @Description Streams CSV of aggregated sales orders within an optional date range. Requires admin/manager.
// @Tags sales
// @Security Bearer
// @Produce text/csv
// @Param from query string false "From date (YYYY-MM-DD)"
// @Param to query string false "To date (YYYY-MM-DD)"
// @Success 200 {file} string "CSV file"
// @Failure 401 {object} map[string]interface{} "invalid tenant/auth"
// @Failure 403 {object} map[string]interface{} "insufficient permissions"
// @Failure 500 {object} map[string]interface{} "internal error"
// @Router /sales/orders.csv [get]
func (h *Handler) exportSalesOrdersCSV(c echo.Context) error {
	if !auth.CanExport(c.Request().Context()) {
		return c.JSON(http.StatusForbidden, map[string]interface{}{
			"success": false,
			"error": map[string]interface{}{
				"code":    http.StatusForbidden,
				"message": "insufficient permissions",
			},
		})
	}

	tenantStr, ok := c.Get("tenant_id").(string)
	if !ok || tenantStr == "" {
		return c.JSON(http.StatusUnauthorized, map[string]interface{}{
			"success": false,
			"error": map[string]interface{}{
				"code":    http.StatusUnauthorized,
				"message": "invalid tenant context",
			},
		})
	}
	tenantID, err := uuid.Parse(tenantStr)
	if err != nil {
		return c.JSON(http.StatusUnauthorized, map[string]interface{}{
			"success": false,
			"error": map[string]interface{}{
				"code":    http.StatusUnauthorized,
				"message": "invalid tenant id",
			},
		})
	}

	// Parse optional date range query params ?from=YYYY-MM-DD&to=YYYY-MM-DD
	var from, to time.Time
	if fs := c.QueryParam("from"); fs != "" {
		if t, err := time.Parse("2006-01-02", fs); err == nil {
			from = t
		}
	}
	if ts := c.QueryParam("to"); ts != "" {
		if t, err := time.Parse("2006-01-02", ts); err == nil {
			to = t
		}
	}
	// Default range: last 30 days if not provided
	if from.IsZero() || to.IsZero() {
		to = time.Now().UTC()
		from = to.AddDate(0, 0, -30)
	}

	rows, err := h.svc.GetSalesReportByDate(c.Request().Context(), tenantID, from, to)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]interface{}{
			"success": false,
			"error": map[string]interface{}{
				"code":    http.StatusInternalServerError,
				"message": "failed to fetch sales report",
			},
		})
	}

	c.Response().Header().Set(echo.HeaderContentType, "text/csv")
	c.Response().Header().Set(echo.HeaderContentDisposition, `attachment; filename="sales_orders.csv"`)

	w := csv.NewWriter(c.Response())
	defer w.Flush()

	// Write header
	_ = w.Write([]string{"product_name", "total_units_sold", "total_revenue"})

	// Write rows
	for _, r := range rows {
		_ = w.Write([]string{
			r.ProductName,
			strconv.FormatInt(r.TotalUnitsSold, 10),
			strconv.FormatInt(r.TotalRevenue, 10),
		})
	}

	return nil
}

// CreateSalesOrderRequest represents the request body for creating a sales order
type CreateSalesOrderRequest struct {
	CustomerID           uuid.UUID                       `json:"customer_id" validate:"required"`
	LocationID           *uuid.UUID                      `json:"location_id,omitempty"`
	ExpectedDeliveryDate *time.Time                      `json:"expected_delivery_date,omitempty"`
	Notes                string                          `json:"notes,omitempty"`
	Items                []CreateSalesOrderItemRequest   `json:"items" validate:"required,dive"`
}

type CreateSalesOrderItemRequest struct {
	ProductID       uuid.UUID `json:"product_id" validate:"required"`
	BatchID         *uuid.UUID `json:"batch_id,omitempty"`
	QuantityOrdered int       `json:"quantity_ordered" validate:"required,min=1"`
	UnitPrice       int       `json:"unit_price" validate:"required,min=0"`
	TaxPercent      int       `json:"tax_percent,omitempty"`
	DiscountPercent int       `json:"discount_percent,omitempty"`
	Notes           string    `json:"notes,omitempty"`
}

// CreateSalesOrder godoc
// @Summary Create sales order
// @Description Create a new sales order with items
// @Tags sales
// @Security Bearer
// @Accept json
// @Produce json
// @Param request body CreateSalesOrderRequest true "Sales order request"
// @Success 201 {object} map[string]interface{} "Sales order created successfully"
// @Failure 400 {object} map[string]interface{} "Bad request"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /sales/orders [post]
func (h *Handler) CreateSalesOrder(c echo.Context) error {
	var req CreateSalesOrderRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{
			"success": false,
			"error": map[string]interface{}{
				"code":    http.StatusBadRequest,
				"message": "invalid request body",
			},
		})
	}

	tenantID, err := uuid.Parse(c.Get("tenant_id").(string))
	if err != nil {
		return c.JSON(http.StatusUnauthorized, map[string]interface{}{
			"success": false,
			"error": map[string]interface{}{
				"code":    http.StatusUnauthorized,
				"message": "invalid tenant",
			},
		})
	}

	userID, err := uuid.Parse(c.Get("user_id").(string))
	if err != nil {
		return c.JSON(http.StatusUnauthorized, map[string]interface{}{
			"success": false,
			"error": map[string]interface{}{
				"code":    http.StatusUnauthorized,
				"message": "invalid user",
			},
		})
	}

	// Generate SO number
	soNumber := generateSONumber()

	// Calculate totals
	totalAmount := 0
	items := make([]CreateSalesOrderItemParams, len(req.Items))
	for i, item := range req.Items {
		totalPrice := item.UnitPrice * item.QuantityOrdered
		totalAmount += totalPrice
		
		items[i] = CreateSalesOrderItemParams{
			ProductID:       item.ProductID,
			BatchID:         item.BatchID,
			QuantityOrdered: item.QuantityOrdered,
			UnitPrice:       item.UnitPrice,
			TotalPrice:      totalPrice,
			TaxPercent:      item.TaxPercent,
			DiscountPercent: item.DiscountPercent,
			Notes:           item.Notes,
		}
	}

	salesOrder, err := h.svc.CreateSalesOrder(c.Request().Context(), CreateSalesOrderParams{
		TenantID:             tenantID,
		SoNumber:             soNumber,
		CustomerID:           req.CustomerID,
		LocationID:           req.LocationID,
		ExpectedDeliveryDate: req.ExpectedDeliveryDate,
		TotalAmount:          totalAmount,
		FinalAmount:          totalAmount,
		Notes:                req.Notes,
		CreatedBy:            userID,
		Items:                items,
	})
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]interface{}{
			"success": false,
			"error": map[string]interface{}{
				"code":    http.StatusInternalServerError,
				"message": "failed to create sales order",
			},
		})
	}

	return c.JSON(http.StatusCreated, map[string]interface{}{
		"success": true,
		"data":    salesOrder,
		"message": "Sales order created successfully",
	})
}

// ListSalesOrders godoc
// @Summary List sales orders
// @Description Get paginated list of sales orders for the current tenant
// @Tags sales
// @Security Bearer
// @Produce json
// @Param customer_id query string false "Filter by customer ID"
// @Param page query int false "Page number (default: 1)"
// @Param limit query int false "Items per page (default: 20, max: 100)"
// @Success 200 {object} map[string]interface{} "Sales orders list"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /sales/orders [get]
func (h *Handler) ListSalesOrders(c echo.Context) error {
	tenantID, err := uuid.Parse(c.Get("tenant_id").(string))
	if err != nil {
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

	// Check if filtering by customer
	customerIDStr := c.QueryParam("customer_id")
	if customerIDStr != "" {
		customerID, err := uuid.Parse(customerIDStr)
		if err != nil {
			return c.JSON(http.StatusBadRequest, map[string]interface{}{
				"success": false,
				"error": map[string]interface{}{
					"code":    http.StatusBadRequest,
					"message": "invalid customer ID",
				},
			})
		}

		orders, err := h.svc.ListSalesOrdersByCustomer(c.Request().Context(), tenantID, customerID, int32(limit), offset)
		if err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]interface{}{
				"success": false,
				"error": map[string]interface{}{
					"code":    http.StatusInternalServerError,
					"message": "failed to fetch sales orders",
				},
			})
		}

		return c.JSON(http.StatusOK, map[string]interface{}{
			"success": true,
			"data":    orders,
			"pagination": map[string]interface{}{
				"page":        page,
				"limit":       limit,
				"customer_id": customerID,
			},
		})
	}

	// TODO: Implement general sales orders listing (requires new query)
	return c.JSON(http.StatusOK, map[string]interface{}{
		"success": true,
		"data":    []interface{}{},
		"message": "General sales orders listing not yet implemented",
	})
}

// GetSalesOrder godoc
// @Summary Get sales order
// @Description Get sales order details by ID
// @Tags sales
// @Security Bearer
// @Produce json
// @Param id path string true "Sales order ID"
// @Success 200 {object} map[string]interface{} "Sales order details"
// @Failure 400 {object} map[string]interface{} "Bad request"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 404 {object} map[string]interface{} "Not found"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /sales/orders/{id} [get]
func (h *Handler) GetSalesOrder(c echo.Context) error {
	salesOrderID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{
			"success": false,
			"error": map[string]interface{}{
				"code":    http.StatusBadRequest,
				"message": "invalid sales order ID",
			},
		})
	}

	tenantID, err := uuid.Parse(c.Get("tenant_id").(string))
	if err != nil {
		return c.JSON(http.StatusUnauthorized, map[string]interface{}{
			"success": false,
			"error": map[string]interface{}{
				"code":    http.StatusUnauthorized,
				"message": "invalid tenant",
			},
		})
	}

	salesOrder, err := h.svc.GetSalesOrder(c.Request().Context(), salesOrderID, tenantID)
	if err != nil {
		return c.JSON(http.StatusNotFound, map[string]interface{}{
			"success": false,
			"error": map[string]interface{}{
				"code":    http.StatusNotFound,
				"message": "sales order not found",
			},
		})
	}

	items, err := h.svc.GetSalesOrderItems(c.Request().Context(), salesOrderID, tenantID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]interface{}{
			"success": false,
			"error": map[string]interface{}{
				"code":    http.StatusInternalServerError,
				"message": "failed to fetch sales order items",
			},
		})
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"success": true,
		"data": map[string]interface{}{
			"order": salesOrder,
			"items": items,
		},
	})
}

// UpdateSalesOrderStatusRequest represents the request body for updating sales order status
type UpdateSalesOrderStatusRequest struct {
	Status string `json:"status" validate:"required,oneof=PENDING APPROVED SHIPPED DELIVERED CANCELLED"`
}

// UpdateSalesOrderStatus godoc
// @Summary Update sales order status
// @Description Update the status of a sales order
// @Tags sales
// @Security Bearer
// @Accept json
// @Produce json
// @Param id path string true "Sales order ID"
// @Param request body UpdateSalesOrderStatusRequest true "Status update request"
// @Success 200 {object} map[string]interface{} "Status updated successfully"
// @Failure 400 {object} map[string]interface{} "Bad request"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 404 {object} map[string]interface{} "Not found"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /sales/orders/{id}/status [put]
func (h *Handler) UpdateSalesOrderStatus(c echo.Context) error {
	salesOrderID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{
			"success": false,
			"error": map[string]interface{}{
				"code":    http.StatusBadRequest,
				"message": "invalid sales order ID",
			},
		})
	}

	var req UpdateSalesOrderStatusRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{
			"success": false,
			"error": map[string]interface{}{
				"code":    http.StatusBadRequest,
				"message": "invalid request body",
			},
		})
	}

	tenantID, err := uuid.Parse(c.Get("tenant_id").(string))
	if err != nil {
		return c.JSON(http.StatusUnauthorized, map[string]interface{}{
			"success": false,
			"error": map[string]interface{}{
				"code":    http.StatusUnauthorized,
				"message": "invalid tenant",
			},
		})
	}

	err = h.svc.UpdateSalesOrderStatus(c.Request().Context(), salesOrderID, tenantID, req.Status)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]interface{}{
			"success": false,
			"error": map[string]interface{}{
				"code":    http.StatusInternalServerError,
				"message": "failed to update sales order status",
			},
		})
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "Sales order status updated successfully",
	})
}

// ShipSalesOrderItemRequest represents the request body for shipping items
type ShipSalesOrderItemRequest struct {
	ItemID          uuid.UUID `json:"item_id" validate:"required"`
	QuantityShipped int       `json:"quantity_shipped" validate:"required,min=1"`
}

// ShipSalesOrderItem godoc
// @Summary Ship sales order item
// @Description Update the shipped quantity for a sales order item
// @Tags sales
// @Security Bearer
// @Accept json
// @Produce json
// @Param id path string true "Sales order ID"
// @Param request body ShipSalesOrderItemRequest true "Ship item request"
// @Success 200 {object} map[string]interface{} "Item shipped successfully"
// @Failure 400 {object} map[string]interface{} "Bad request"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 404 {object} map[string]interface{} "Not found"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /sales/orders/{id}/ship [post]
func (h *Handler) ShipSalesOrderItem(c echo.Context) error {
	var req ShipSalesOrderItemRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{
			"success": false,
			"error": map[string]interface{}{
				"code":    http.StatusBadRequest,
				"message": "invalid request body",
			},
		})
	}

	tenantID, err := uuid.Parse(c.Get("tenant_id").(string))
	if err != nil {
		return c.JSON(http.StatusUnauthorized, map[string]interface{}{
			"success": false,
			"error": map[string]interface{}{
				"code":    http.StatusUnauthorized,
				"message": "invalid tenant",
			},
		})
	}

	updatedItem, err := h.svc.UpdateSalesOrderItemQuantityShipped(c.Request().Context(), req.ItemID, tenantID, req.QuantityShipped)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]interface{}{
			"success": false,
			"error": map[string]interface{}{
				"code":    http.StatusInternalServerError,
				"message": "failed to ship sales order item",
			},
		})
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"success": true,
		"data":    updatedItem,
		"message": "Sales order item shipped successfully",
	})
}

// generateSONumber generates a unique sales order number
func generateSONumber() string {
	return "SO-" + strconv.FormatInt(time.Now().Unix(), 10)
}