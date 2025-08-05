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