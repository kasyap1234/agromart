package reports

import (
	"net/http"

	"github.com/labstack/echo/v4"
	"agromart2/db"
	"agromart2/internal/auth"
)

type Handler struct {
	queries *db.Queries
}

func NewHandler(q *db.Queries) *Handler {
	return &Handler{queries: q}
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
	tenantID, err := auth.GetTenantIDFromContext(c)
	if err != nil {
		return c.JSON(http.StatusUnauthorized, map[string]interface{}{
			"error": "invalid tenant context",
		})
	}

	// Get total products
	totalProducts, err := h.queries.CountProductsByTenant(c.Request().Context(), tenantID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]interface{}{
			"error": "failed to get product count",
		})
	}

	// Get low stock products (threshold = 5)
	lowStock, err := h.queries.GetLowStockReport(c.Request().Context(), db.GetLowStockReportParams{
		TenantID: tenantID,
		Column2:  5,
	})
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]interface{}{
			"error": "failed to get low stock report",
		})
	}

	// Get expiring batches (within 5 days)
	expiringBatches, err := h.queries.GetExpiringBatches(c.Request().Context(), db.GetExpiringBatchesParams{
		TenantID: tenantID,
		Column2:  "5",
	})
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]interface{}{
			"error": "failed to get expiring batches",
		})
	}

	// Get inventory value
	inventoryValue, err := h.queries.GetInventoryValue(c.Request().Context(), tenantID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]interface{}{
			"error": "failed to get inventory value",
		})
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"total_products":        totalProducts,
		"low_stock_products":    len(lowStock),
		"expiring_batches":      len(expiringBatches),
		"total_inventory_value": inventoryValue,
	})
}