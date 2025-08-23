package locations

import (
	"net/http"
	"strconv"

	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
)

// LocationsHandler handles location-related HTTP requests
type LocationsHandler struct {
	service *LocationsService
}

// NewLocationsHandler creates a new locations handler
func NewLocationsHandler(service *LocationsService) *LocationsHandler {
	return &LocationsHandler{service: service}
}

// RegisterRoutes registers location routes under provided group (expected to be /api)
// @Tags locations
// @Security Bearer
func (h *LocationsHandler) RegisterRoutes(g *echo.Group) {
	g.POST("/locations", h.CreateLocation)
	g.PUT("/locations/:id", h.UpdateLocation)
	g.DELETE("/locations/:id", h.DeleteLocation)
	g.GET("/locations", h.ListLocations)
	g.GET("/locations/active", h.ListActiveLocations)
	g.GET("/locations/types/:type", h.ListLocationsByType)
	g.GET("/locations/:id", h.GetLocation)
	g.GET("/locations/managers/:managerId", h.GetLocationsByManager)
	g.GET("/locations/capacity", h.GetLocationsWithCapacity)
}

// CreateLocation godoc
// @Summary Create a new location
// @Description Create a new warehouse, store, or other location
// @Tags locations
// @Security Bearer
// @Accept json
// @Produce json
// @Param payload body CreateLocationRequest true "Location creation payload"
// @Success 201 {object} map[string]interface{} "location created successfully"
// @Failure 400 {object} map[string]interface{} "invalid request body"
// @Failure 401 {object} map[string]interface{} "invalid tenant/auth"
// @Failure 500 {object} map[string]interface{} "internal error"
// @Router /locations [post]
func (h *LocationsHandler) CreateLocation(c echo.Context) error {
	tenantStr, _ := c.Get("tenant_id").(string)
	tenantID, err := uuid.Parse(tenantStr)
	if err != nil || tenantStr == "" {
		return c.JSON(http.StatusUnauthorized, map[string]any{
			"success": false,
			"error": map[string]any{
				"code":    http.StatusUnauthorized,
				"message": "invalid tenant",
			},
		})
	}

	var req CreateLocationRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]any{
			"success": false,
			"error": map[string]any{
				"code":    http.StatusBadRequest,
				"message": "invalid request body",
			},
		})
	}

	// Basic validation
	if req.Name == "" {
		return c.JSON(http.StatusBadRequest, map[string]any{
			"success": false,
			"error": map[string]any{
				"code":    http.StatusBadRequest,
				"message": "location name is required",
			},
		})
	}

	if req.LocationType == "" {
		req.LocationType = "WAREHOUSE" // Default type
	}

	params := LocationParams{
		TenantID:              tenantID,
		Name:                  req.Name,
		Address:               req.Address,
		City:                  req.City,
		State:                 req.State,
		PostalCode:            req.PostalCode,
		Country:               req.Country,
		Phone:                 req.Phone,
		Email:                 req.Email,
		LocationType:          req.LocationType,
		Capacity:              req.Capacity,
		CapacityUnit:          req.CapacityUnit,
		ManagerID:             req.ManagerID,
		OperatingHours:        req.OperatingHours,
		TemperatureControlled: req.TemperatureControlled,
		SecurityLevel:         req.SecurityLevel,
		IsActive:              req.IsActive,
		Notes:                 req.Notes,
	}

	location, err := h.service.CreateLocation(c.Request().Context(), params)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]any{
			"success": false,
			"error": map[string]any{
				"code":    http.StatusInternalServerError,
				"message": err.Error(),
			},
		})
	}

	return c.JSON(http.StatusCreated, map[string]any{
		"success": true,
		"data":    location,
		"message": "Location created successfully",
	})
}

// UpdateLocation godoc
// @Summary Update an existing location
// @Description Update location details including address, manager, capacity, etc.
// @Tags locations
// @Security Bearer
// @Accept json
// @Produce json
// @Param id path string true "Location ID"
// @Param payload body UpdateLocationRequest true "Location update payload"
// @Success 200 {object} map[string]interface{} "location updated successfully"
// @Failure 400 {object} map[string]interface{} "invalid request body"
// @Failure 401 {object} map[string]interface{} "invalid tenant/auth"
// @Failure 404 {object} map[string]interface{} "location not found"
// @Failure 500 {object} map[string]interface{} "internal error"
// @Router /locations/{id} [put]
func (h *LocationsHandler) UpdateLocation(c echo.Context) error {
	tenantStr, _ := c.Get("tenant_id").(string)
	tenantID, err := uuid.Parse(tenantStr)
	if err != nil || tenantStr == "" {
		return c.JSON(http.StatusUnauthorized, map[string]any{
			"success": false,
			"error": map[string]any{
				"code":    http.StatusUnauthorized,
				"message": "invalid tenant",
			},
		})
	}

	locationID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]any{
			"success": false,
			"error": map[string]any{
				"code":    http.StatusBadRequest,
				"message": "invalid location ID",
			},
		})
	}

	var req UpdateLocationRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]any{
			"success": false,
			"error": map[string]any{
				"code":    http.StatusBadRequest,
				"message": "invalid request body",
			},
		})
	}

	// Basic validation
	if req.Name == "" {
		return c.JSON(http.StatusBadRequest, map[string]any{
			"success": false,
			"error": map[string]any{
				"code":    http.StatusBadRequest,
				"message": "location name is required",
			},
		})
	}

	params := LocationParams{
		TenantID:              tenantID,
		Name:                  req.Name,
		Address:               req.Address,
		City:                  req.City,
		State:                 req.State,
		PostalCode:            req.PostalCode,
		Country:               req.Country,
		Phone:                 req.Phone,
		Email:                 req.Email,
		LocationType:          req.LocationType,
		Capacity:              req.Capacity,
		CapacityUnit:          req.CapacityUnit,
		ManagerID:             req.ManagerID,
		OperatingHours:        req.OperatingHours,
		TemperatureControlled: req.TemperatureControlled,
		SecurityLevel:         req.SecurityLevel,
		IsActive:              req.IsActive,
		Notes:                 req.Notes,
	}

	location, err := h.service.UpdateLocation(c.Request().Context(), locationID, params)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]any{
			"success": false,
			"error": map[string]any{
				"code":    http.StatusInternalServerError,
				"message": err.Error(),
			},
		})
	}

	return c.JSON(http.StatusOK, map[string]any{
		"success": true,
		"data":    location,
		"message": "Location updated successfully",
	})
}

// DeleteLocation godoc
// @Summary Delete a location (soft delete)
// @Description Soft delete a location by setting it as inactive
// @Tags locations
// @Security Bearer
// @Produce json
// @Param id path string true "Location ID"
// @Success 200 {object} map[string]interface{} "location deleted successfully"
// @Failure 400 {object} map[string]interface{} "invalid location ID"
// @Failure 401 {object} map[string]interface{} "invalid tenant/auth"
// @Failure 500 {object} map[string]interface{} "internal error"
// @Router /locations/{id} [delete]
func (h *LocationsHandler) DeleteLocation(c echo.Context) error {
	tenantStr, _ := c.Get("tenant_id").(string)
	tenantID, err := uuid.Parse(tenantStr)
	if err != nil || tenantStr == "" {
		return c.JSON(http.StatusUnauthorized, map[string]any{
			"success": false,
			"error": map[string]any{
				"code":    http.StatusUnauthorized,
				"message": "invalid tenant",
			},
		})
	}

	locationID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]any{
			"success": false,
			"error": map[string]any{
				"code":    http.StatusBadRequest,
				"message": "invalid location ID",
			},
		})
	}

	err = h.service.DeleteLocation(c.Request().Context(), tenantID, locationID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]any{
			"success": false,
			"error": map[string]any{
				"code":    http.StatusInternalServerError,
				"message": err.Error(),
			},
		})
	}

	return c.JSON(http.StatusOK, map[string]any{
		"success": true,
		"message": "Location deleted successfully",
	})
}

// GetLocation godoc
// @Summary Get a specific location
// @Description Retrieve details of a specific location by ID
// @Tags locations
// @Security Bearer
// @Produce json
// @Param id path string true "Location ID"
// @Success 200 {object} map[string]interface{} "location details"
// @Failure 400 {object} map[string]interface{} "invalid location ID"
// @Failure 401 {object} map[string]interface{} "invalid tenant/auth"
// @Failure 404 {object} map[string]interface{} "location not found"
// @Failure 500 {object} map[string]interface{} "internal error"
// @Router /locations/{id} [get]
func (h *LocationsHandler) GetLocation(c echo.Context) error {
	tenantStr, _ := c.Get("tenant_id").(string)
	tenantID, err := uuid.Parse(tenantStr)
	if err != nil || tenantStr == "" {
		return c.JSON(http.StatusUnauthorized, map[string]any{
			"success": false,
			"error": map[string]any{
				"code":    http.StatusUnauthorized,
				"message": "invalid tenant",
			},
		})
	}

	locationID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]any{
			"success": false,
			"error": map[string]any{
				"code":    http.StatusBadRequest,
				"message": "invalid location ID",
			},
		})
	}

	location, err := h.service.GetLocationByID(c.Request().Context(), tenantID, locationID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]any{
			"success": false,
			"error": map[string]any{
				"code":    http.StatusInternalServerError,
				"message": err.Error(),
			},
		})
	}

	return c.JSON(http.StatusOK, map[string]any{
		"success": true,
		"data":    location,
	})
}

// ListLocations godoc
// @Summary List locations with filtering
// @Description Retrieve a paginated list of locations with optional filtering
// @Tags locations
// @Security Bearer
// @Produce json
// @Param type query string false "Location type filter (WAREHOUSE, STORE, OFFICE, DISTRIBUTION_CENTER)"
// @Param active query boolean false "Filter by active status" default(true)
// @Param limit query int false "Number of items per page" default(50)
// @Param offset query int false "Number of items to skip" default(0)
// @Success 200 {object} map[string]interface{} "locations list"
// @Failure 401 {object} map[string]interface{} "invalid tenant/auth"
// @Failure 500 {object} map[string]interface{} "internal error"
// @Router /locations [get]
func (h *LocationsHandler) ListLocations(c echo.Context) error {
	tenantStr, _ := c.Get("tenant_id").(string)
	tenantID, err := uuid.Parse(tenantStr)
	if err != nil || tenantStr == "" {
		return c.JSON(http.StatusUnauthorized, map[string]any{
			"success": false,
			"error": map[string]any{
				"code":    http.StatusUnauthorized,
				"message": "invalid tenant",
			},
		})
	}

	// Parse query parameters
	locationType := c.QueryParam("type")
	if locationType == "" {
		locationType = "WAREHOUSE" // Default filter
	}

	isActive := true
	if activeParam := c.QueryParam("active"); activeParam != "" {
		if activeParam == "false" {
			isActive = false
		}
	}

	limit := 50
	if limitParam := c.QueryParam("limit"); limitParam != "" {
		if l, err := strconv.Atoi(limitParam); err == nil && l > 0 && l <= 100 {
			limit = l
		}
	}

	offset := 0
	if offsetParam := c.QueryParam("offset"); offsetParam != "" {
		if o, err := strconv.Atoi(offsetParam); err == nil && o >= 0 {
			offset = o
		}
	}

	locations, err := h.service.ListLocations(c.Request().Context(), tenantID, locationType, isActive, limit, offset)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]any{
			"success": false,
			"error": map[string]any{
				"code":    http.StatusInternalServerError,
				"message": err.Error(),
			},
		})
	}

	return c.JSON(http.StatusOK, map[string]any{
		"success": true,
		"data":    locations,
		"meta": map[string]any{
			"limit":  limit,
			"offset": offset,
			"count":  len(locations),
		},
	})
}

// ListActiveLocations godoc
// @Summary List all active locations
// @Description Retrieve a list of all active locations for the tenant
// @Tags locations
// @Security Bearer
// @Produce json
// @Success 200 {object} map[string]interface{} "active locations list"
// @Failure 401 {object} map[string]interface{} "invalid tenant/auth"
// @Failure 500 {object} map[string]interface{} "internal error"
// @Router /locations/active [get]
func (h *LocationsHandler) ListActiveLocations(c echo.Context) error {
	tenantStr, _ := c.Get("tenant_id").(string)
	tenantID, err := uuid.Parse(tenantStr)
	if err != nil || tenantStr == "" {
		return c.JSON(http.StatusUnauthorized, map[string]any{
			"success": false,
			"error": map[string]any{
				"code":    http.StatusUnauthorized,
				"message": "invalid tenant",
			},
		})
	}

	locations, err := h.service.ListActiveLocations(c.Request().Context(), tenantID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]any{
			"success": false,
			"error": map[string]any{
				"code":    http.StatusInternalServerError,
				"message": err.Error(),
			},
		})
	}

	return c.JSON(http.StatusOK, map[string]any{
		"success": true,
		"data":    locations,
	})
}

// ListLocationsByType godoc
// @Summary List locations by type
// @Description Retrieve all locations of a specific type
// @Tags locations
// @Security Bearer
// @Produce json
// @Param type path string true "Location type (WAREHOUSE, STORE, OFFICE, DISTRIBUTION_CENTER)"
// @Success 200 {object} map[string]interface{} "locations by type"
// @Failure 401 {object} map[string]interface{} "invalid tenant/auth"
// @Failure 500 {object} map[string]interface{} "internal error"
// @Router /locations/types/{type} [get]
func (h *LocationsHandler) ListLocationsByType(c echo.Context) error {
	tenantStr, _ := c.Get("tenant_id").(string)
	tenantID, err := uuid.Parse(tenantStr)
	if err != nil || tenantStr == "" {
		return c.JSON(http.StatusUnauthorized, map[string]any{
			"success": false,
			"error": map[string]any{
				"code":    http.StatusUnauthorized,
				"message": "invalid tenant",
			},
		})
	}

	locationType := c.Param("type")
	if locationType == "" {
		locationType = "WAREHOUSE"
	}

	locations, err := h.service.ListLocationsByType(c.Request().Context(), tenantID, locationType)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]any{
			"success": false,
			"error": map[string]any{
				"code":    http.StatusInternalServerError,
				"message": err.Error(),
			},
		})
	}

	return c.JSON(http.StatusOK, map[string]any{
		"success": true,
		"data":    locations,
	})
}

// GetLocationsByManager godoc
// @Summary Get locations managed by a user
// @Description Retrieve all locations managed by a specific user
// @Tags locations
// @Security Bearer
// @Produce json
// @Param managerId path string true "Manager user ID"
// @Success 200 {object} map[string]interface{} "locations by manager"
// @Failure 400 {object} map[string]interface{} "invalid manager ID"
// @Failure 401 {object} map[string]interface{} "invalid tenant/auth"
// @Failure 500 {object} map[string]interface{} "internal error"
// @Router /locations/managers/{managerId} [get]
func (h *LocationsHandler) GetLocationsByManager(c echo.Context) error {
	tenantStr, _ := c.Get("tenant_id").(string)
	tenantID, err := uuid.Parse(tenantStr)
	if err != nil || tenantStr == "" {
		return c.JSON(http.StatusUnauthorized, map[string]any{
			"success": false,
			"error": map[string]any{
				"code":    http.StatusUnauthorized,
				"message": "invalid tenant",
			},
		})
	}

	managerID, err := uuid.Parse(c.Param("managerId"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]any{
			"success": false,
			"error": map[string]any{
				"code":    http.StatusBadRequest,
				"message": "invalid manager ID",
			},
		})
	}

	locations, err := h.service.GetLocationsByManager(c.Request().Context(), tenantID, managerID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]any{
			"success": false,
			"error": map[string]any{
				"code":    http.StatusInternalServerError,
				"message": err.Error(),
			},
		})
	}

	return c.JSON(http.StatusOK, map[string]any{
		"success": true,
		"data":    locations,
	})
}

// GetLocationsWithCapacity godoc
// @Summary Get locations with capacity information
// @Description Retrieve all locations that have capacity information defined
// @Tags locations
// @Security Bearer
// @Produce json
// @Success 200 {object} map[string]interface{} "locations with capacity"
// @Failure 401 {object} map[string]interface{} "invalid tenant/auth"
// @Failure 500 {object} map[string]interface{} "internal error"
// @Router /locations/capacity [get]
func (h *LocationsHandler) GetLocationsWithCapacity(c echo.Context) error {
	tenantStr, _ := c.Get("tenant_id").(string)
	tenantID, err := uuid.Parse(tenantStr)
	if err != nil || tenantStr == "" {
		return c.JSON(http.StatusUnauthorized, map[string]any{
			"success": false,
			"error": map[string]any{
				"code":    http.StatusUnauthorized,
				"message": "invalid tenant",
			},
		})
	}

	locations, err := h.service.GetLocationsWithCapacity(c.Request().Context(), tenantID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]any{
			"success": false,
			"error": map[string]any{
				"code":    http.StatusInternalServerError,
				"message": err.Error(),
			},
		})
	}

	return c.JSON(http.StatusOK, map[string]any{
		"success": true,
		"data":    locations,
	})
}

// Request/Response DTOs

type CreateLocationRequest struct {
	Name                  string  `json:"name" validate:"required"`
	Address               *string `json:"address"`
	City                  *string `json:"city"`
	State                 *string `json:"state"`
	PostalCode            *string `json:"postal_code"`
	Country               *string `json:"country"`
	Phone                 *string `json:"phone"`
	Email                 *string `json:"email"`
	LocationType          string  `json:"location_type"`
	Capacity              *string `json:"capacity"`
	CapacityUnit          *string `json:"capacity_unit"`
	ManagerID             *uuid.UUID `json:"manager_id"`
	OperatingHours        *string `json:"operating_hours"`
	TemperatureControlled bool    `json:"temperature_controlled"`
	SecurityLevel         *string `json:"security_level"`
	IsActive              bool    `json:"is_active"`
	Notes                 *string `json:"notes"`
}

type UpdateLocationRequest struct {
	Name                  string  `json:"name" validate:"required"`
	Address               *string `json:"address"`
	City                  *string `json:"city"`
	State                 *string `json:"state"`
	PostalCode            *string `json:"postal_code"`
	Country               *string `json:"country"`
	Phone                 *string `json:"phone"`
	Email                 *string `json:"email"`
	LocationType          string  `json:"location_type"`
	Capacity              *string `json:"capacity"`
	CapacityUnit          *string `json:"capacity_unit"`
	ManagerID             *uuid.UUID `json:"manager_id"`
	OperatingHours        *string `json:"operating_hours"`
	TemperatureControlled bool    `json:"temperature_controlled"`
	SecurityLevel         *string `json:"security_level"`
	IsActive              bool    `json:"is_active"`
	Notes                 *string `json:"notes"`
}