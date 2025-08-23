package reports

import (
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
	"agromart2/db"
	"agromart2/internal/errors"
)

type Handler struct {
	queries *db.Queries
}

func NewHandler(q *db.Queries) *Handler {
	return &Handler{queries: q}
}

// RegisterRoutes registers all reports routes
func (h *Handler) RegisterRoutes(g *echo.Group) {
	g.GET("/dashboard-stats", h.DashboardStats)
}

// DashboardStats godoc
// @Summary Get dashboard statistics
// @Description Returns key metrics for the dashboard
// @Tags reports
// @Security Bearer
// @Produce json
// @Success 200 {object} map[string]interface{} "Dashboard statistics"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /reports/dashboard-stats [get]
func (h *Handler) DashboardStats(c echo.Context) error {
	tenantStr, _ := c.Get("tenant_id").(string)
	tenantID, err := uuid.Parse(tenantStr)
	if err != nil || tenantStr == "" {
		return c.JSON(http.StatusUnauthorized, map[string]interface{}{
			"success": false,
			"error": map[string]interface{}{
				"code":    http.StatusUnauthorized,
				"message": "invalid tenant context",
			},
		})
	}

	// Get total products
	totalProducts, err := h.queries.CountProductsByTenant(c.Request().Context(), tenantID)
	if err != nil {
		customErr := errors.Wrap(err, http.StatusInternalServerError, "failed to get product count")
		return c.JSON(customErr.HTTPStatus(), map[string]interface{}{
			"success": false,
			"error": map[string]interface{}{
				"code":    customErr.HTTPStatus(),
				"message": customErr.Error(),
			},
		})
	}

	// Get low stock products (threshold = 10 to match existing implementation)
	lowStock, err := h.queries.GetLowStockReport(c.Request().Context(), db.GetLowStockReportParams{
		TenantID: tenantID,
		Quantity: "10",
	})
	if err != nil {
		customErr := errors.Wrap(err, http.StatusInternalServerError, "failed to get low stock report")
		return c.JSON(customErr.HTTPStatus(), map[string]interface{}{
			"success": false,
			"error": map[string]interface{}{
				"code":    customErr.HTTPStatus(),
				"message": customErr.Error(),
			},
		})
	}

	// Get expiring batches (within 30 days to match existing implementation)
	expiryDate := time.Now().AddDate(0, 0, 30)
	expiringBatches, err := h.queries.GetExpiringBatches(c.Request().Context(), db.GetExpiringBatchesParams{
		TenantID: tenantID,
		Column2:  expiryDate,
	})
	if err != nil {
		customErr := errors.Wrap(err, http.StatusInternalServerError, "failed to get expiring batches")
		return c.JSON(customErr.HTTPStatus(), map[string]interface{}{
			"success": false,
			"error": map[string]interface{}{
				"code":    customErr.HTTPStatus(),
				"message": customErr.Error(),
			},
		})
	}

	// Get inventory value
	inventoryValue, err := h.queries.GetInventoryValue(c.Request().Context(), tenantID)
	if err != nil {
		customErr := errors.Wrap(err, http.StatusInternalServerError, "failed to get inventory value")
		return c.JSON(customErr.HTTPStatus(), map[string]interface{}{
			"success": false,
			"error": map[string]interface{}{
				"code":    customErr.HTTPStatus(),
				"message": customErr.Error(),
			},
		})
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"success": true,
		"data": map[string]interface{}{
			"total_products":     totalProducts,
			"low_stock_count":    len(lowStock),
			"total_value":        inventoryValue,
			"expiring_batches":   len(expiringBatches),
		},
	})
}