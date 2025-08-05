package purchase_orders

import (
	"encoding/csv"
	"net/http"
	"strconv"
	"time"

	"agromart2/internal/auth"
	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
)

// RegisterExportRoutes registers export-specific routes for purchase orders.
func (h *Handler) RegisterExportRoutes(g *echo.Group) {
	// CSV export endpoint: /api/purchase-orders.csv
	g.GET("/purchase-orders.csv", h.exportPurchaseOrdersCSV)
}

// exportPurchaseOrdersCSV streams a CSV summary of purchase orders within an optional date range.
// RBAC: requires CanExport(ctx) i.e., role admin or manager.
func (h *Handler) exportPurchaseOrdersCSV(c echo.Context) error {
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

	// Optional date range parsing ?from=YYYY-MM-DD&to=YYYY-MM-DD
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
	// Default last 30 days
	if from.IsZero() || to.IsZero() {
		to = time.Now().UTC()
		from = to.AddDate(0, 0, -30)
	}

	// Reuse existing summary query from service that closely represents CSV needs.
	// Using supplier purchase summary as a useful CSV for POs.
	rows, err := h.service.GetSupplierPurchaseSummary(c.Request().Context(), tenantID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]interface{}{
			"success": false,
			"error": map[string]interface{}{
				"code":    http.StatusInternalServerError,
				"message": "failed to fetch purchase summary",
			},
		})
	}

	c.Response().Header().Set(echo.HeaderContentType, "text/csv")
	c.Response().Header().Set(echo.HeaderContentDisposition, `attachment; filename="purchase_orders.csv"`)

	w := csv.NewWriter(c.Response())
	defer w.Flush()

	// header
	_ = w.Write([]string{"supplier_name", "total_purchased_amount", "total_orders"})

	for _, r := range rows {
		_ = w.Write([]string{
			r.SupplierName,
			strconv.FormatInt(r.TotalPurchasedAmount, 10),
			strconv.FormatInt(r.TotalOrders, 10),
		})
	}

	return nil
}