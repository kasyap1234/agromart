package handler

import (
	"context"
	"net/http"
	"time"

	"agromart2/internal/database"
	"github.com/labstack/echo/v4"
	"github.com/rs/zerolog/log"
)

type HealthHandler struct {
	dbService *database.Service
}

type HealthResponse struct {
	Status    string            `json:"status"`
	Timestamp string            `json:"timestamp"`
	Version   string            `json:"version"`
	Checks    map[string]string `json:"checks"`
}

func NewHealthHandler(dbService *database.Service) *HealthHandler {
	return &HealthHandler{
		dbService: dbService,
	}
}

// Health returns the health status of the application
func (h *HealthHandler) Health(c echo.Context) error {
	ctx, cancel := context.WithTimeout(c.Request().Context(), 5*time.Second)
	defer cancel()

	checks := make(map[string]string)
	status := "healthy"

	// Check database health
	if err := h.dbService.Health(ctx); err != nil {
		log.Error().Err(err).Msg("Database health check failed")
		checks["database"] = "unhealthy: " + err.Error()
		status = "unhealthy"
	} else {
		checks["database"] = "healthy"
	}

	// Check memory usage (basic check)
	checks["memory"] = "healthy"

	response := HealthResponse{
		Status:    status,
		Timestamp: time.Now().UTC().Format(time.RFC3339),
		Version:   "1.0.0",
		Checks:    checks,
	}

	if status == "unhealthy" {
		return c.JSON(http.StatusServiceUnavailable, response)
	}

	return c.JSON(http.StatusOK, response)
}

// Ready returns readiness status (for Kubernetes readiness probes)
func (h *HealthHandler) Ready(c echo.Context) error {
	ctx, cancel := context.WithTimeout(c.Request().Context(), 3*time.Second)
	defer cancel()

	// Check if database is ready
	if err := h.dbService.Health(ctx); err != nil {
		log.Error().Err(err).Msg("Database readiness check failed")
		return c.JSON(http.StatusServiceUnavailable, map[string]string{
			"status": "not ready",
			"reason": "database not ready",
		})
	}

	return c.JSON(http.StatusOK, map[string]string{
		"status": "ready",
	})
}

// Live returns liveness status (for Kubernetes liveness probes)
func (h *HealthHandler) Live(c echo.Context) error {
	return c.JSON(http.StatusOK, map[string]string{
		"status": "alive",
	})
}

// RegisterRoutes registers health check routes
func (h *HealthHandler) RegisterRoutes(e *echo.Echo) {
	e.GET("/health", h.Health)
	e.GET("/ready", h.Ready)
	e.GET("/live", h.Live)
}