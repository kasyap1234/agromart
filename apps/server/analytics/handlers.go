package analytics

import (
	"net/http"
	"strconv"
	"time"

	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
)

type Handler struct {
	svc *Service
}

func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

// RegisterRoutes registers analytics endpoints under provided group (expected: /api)
// @Tags analytics
// @Security Bearer
func (h *Handler) RegisterRoutes(g *echo.Group) {
	ag := g.Group("/analytics")
	ag.GET("/kpis", h.GetKPIs)
	ag.GET("/sales", h.GetSalesSeries)
	ag.GET("/purchases", h.GetPurchasesSeries)
	ag.GET("/inventory", h.GetInventorySnapshot) // placeholder snapshot
}

// GetKPIs godoc
// @Summary Get KPI bundle
// @Description Returns KPI metrics for dashboard
// @Tags analytics
// @Security Bearer
// @Produce json
// @Param from_date query string false "From date (YYYY-MM-DD or RFC3339)"
// @Param to_date query string false "To date (YYYY-MM-DD or RFC3339)"
// @Param threshold query int false "Low stock threshold" minimum(0)
// @Param top query int false "Top N selling products" minimum(0)
// @Param window_days query int false "Forward window days for inventory projection" minimum(0)
// @Success 200 {object} map[string]interface{} "KPIs payload"
// @Failure 401 {object} map[string]interface{} "invalid tenant/auth"
// @Failure 500 {object} map[string]interface{} "internal error"
// @Router /analytics/kpis [get]
func (h *Handler) GetKPIs(c echo.Context) error {
	tenantStr, _ := c.Get("tenant_id").(string)
	if tenantStr == "" {
		return echo.NewHTTPError(http.StatusUnauthorized, "invalid tenant")
	}
	tenantID, err := uuid.Parse(tenantStr)
	if err != nil {
		return echo.NewHTTPError(http.StatusUnauthorized, "invalid tenant id")
	}

	// parse timeframe
	now := time.Now().UTC()
	toDate := parseDateDefault(c.QueryParam("to_date"), now)
	fromDate := parseDateDefault(c.QueryParam("from_date"), now.AddDate(0, 0, -30))

	threshold := parseIntDefault(c.QueryParam("threshold"), 10)
	top := parseIntDefault(c.QueryParam("top"), 5)
	windowDays := parseIntDefault(c.QueryParam("window_days"), 30)
	windowEnd := now.AddDate(0, 0, windowDays)

	params := KPIParams{
		TenantID:  tenantID,
		FromDate:  fromDate,
		ToDate:    toDate,
		Threshold: int32(threshold),
		TopN:      int32(top),
		WindowEnd: windowEnd,
	}
	kpis, err := h.svc.GetKPIs(c.Request().Context(), params)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}
	return c.JSON(http.StatusOK, map[string]interface{}{
		"success": true,
		"data":    kpis,
	})
}

// GetSalesSeries godoc
// @Summary Sales revenue series
// @Description Returns sales revenue time series
// @Tags analytics
// @Security Bearer
// @Produce json
// @Param from_date query string false "From date (YYYY-MM-DD or RFC3339)"
// @Param to_date query string false "To date (YYYY-MM-DD or RFC3339)"
// @Param group query string false "Group by: day or month" Enums(day,month)
// @Success 200 {object} map[string]interface{} "time series points"
// @Failure 401 {object} map[string]interface{} "invalid tenant/auth"
// @Failure 500 {object} map[string]interface{} "internal error"
// @Router /analytics/sales [get]
func (h *Handler) GetSalesSeries(c echo.Context) error {
	return h.seriesCommon(c, true)
}

// GetPurchasesSeries godoc
// @Summary Purchases cost series
// @Description Returns purchases cost time series
// @Tags analytics
// @Security Bearer
// @Produce json
// @Param from_date query string false "From date (YYYY-MM-DD or RFC3339)"
// @Param to_date query string false "To date (YYYY-MM-DD or RFC3339)"
// @Param group query string false "Group by: day or month" Enums(day,month)
// @Success 200 {object} map[string]interface{} "time series points"
// @Failure 401 {object} map[string]interface{} "invalid tenant/auth"
// @Failure 500 {object} map[string]interface{} "internal error"
// @Router /analytics/purchases [get]
func (h *Handler) GetPurchasesSeries(c echo.Context) error {
	return h.seriesCommon(c, false)
}

func (h *Handler) seriesCommon(c echo.Context, sales bool) error {
	tenantStr, _ := c.Get("tenant_id").(string)
	if tenantStr == "" {
		return echo.NewHTTPError(http.StatusUnauthorized, "invalid tenant")
	}
	tenantID, err := uuid.Parse(tenantStr)
	if err != nil {
		return echo.NewHTTPError(http.StatusUnauthorized, "invalid tenant id")
	}

	now := time.Now().UTC()
	toDate := parseDateDefault(c.QueryParam("to_date"), now)
	fromDate := parseDateDefault(c.QueryParam("from_date"), now.AddDate(0, -6, 0))
	group := c.QueryParam("group")
	if group != "day" && group != "month" {
		group = "month"
	}

	params := SeriesParams{
		TenantID: tenantID,
		FromDate: fromDate,
		ToDate:   toDate,
		Group:    group,
	}
	var points []SeriesPoint
	if sales {
		points, err = h.svc.GetSalesSeries(c.Request().Context(), params)
	} else {
		points, err = h.svc.GetPurchasesSeries(c.Request().Context(), params)
	}
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}
	return c.JSON(http.StatusOK, map[string]interface{}{
		"success": true,
		"data":    points,
	})
}

// GetInventorySnapshot godoc
// @Summary Inventory snapshot
// @Description Returns a placeholder inventory snapshot series
// @Tags analytics
// @Security Bearer
// @Produce json
// @Success 200 {object} map[string]interface{} "snapshot series"
// @Failure 401 {object} map[string]interface{} "invalid tenant/auth"
// @Failure 500 {object} map[string]interface{} "internal error"
// @Router /analytics/inventory [get]
func (h *Handler) GetInventorySnapshot(c echo.Context) error {
	tenantStr, _ := c.Get("tenant_id").(string)
	if tenantStr == "" {
		return echo.NewHTTPError(http.StatusUnauthorized, "invalid tenant")
	}
	tenantID, err := uuid.Parse(tenantStr)
	if err != nil {
		return echo.NewHTTPError(http.StatusUnauthorized, "invalid tenant id")
	}

	// Reuse GetKPIs inventory value path to avoid duplicating queries
	now := time.Now().UTC()
	kpis, err := h.svc.GetKPIs(c.Request().Context(), KPIParams{
		TenantID:  tenantID,
		FromDate:  now.AddDate(0, 0, -1),
		ToDate:    now,
		Threshold: 10,
		TopN:      0,
		WindowEnd: now.AddDate(0, 0, 30),
	})
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	pts := []map[string]interface{}{
		{
			"period":          now.Format(time.RFC3339),
			"inventory_value": kpis.InventoryValue,
		},
	}
	return c.JSON(http.StatusOK, map[string]interface{}{
		"success": true,
		"data":    pts,
	})
}

func parseDateDefault(s string, def time.Time) time.Time {
	if s == "" {
		return def
	}
	// Try common formats
	if t, err := time.Parse("2006-01-02", s); err == nil {
		return t
	}
	if t, err := time.Parse(time.RFC3339, s); err == nil {
		return t
	}
	return def
}

func parseIntDefault(s string, def int) int {
	if s == "" {
		return def
	}
	if v, err := strconv.Atoi(s); err == nil {
		return v
	}
	return def
}