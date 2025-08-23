package settings

import (
	"net/http"

	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
)

// SettingsHandler handles settings-related HTTP requests
type SettingsHandler struct {
	service *SettingsService
}

// NewSettingsHandler creates a new settings handler
func NewSettingsHandler(service *SettingsService) *SettingsHandler {
	return &SettingsHandler{service: service}
}

// RegisterRoutes registers settings routes under provided group (expected to be /api)
// @Tags settings
// @Security Bearer
func (h *SettingsHandler) RegisterRoutes(g *echo.Group) {
	g.GET("/settings/tenant", h.GetTenantSettings)
	g.PUT("/settings/tenant", h.UpdateTenantSettings)
	g.GET("/settings/notifications", h.GetNotificationSettings)
	g.PUT("/settings/notifications", h.UpdateNotificationSettings)
}

// GetTenantSettings godoc
// @Summary Get tenant settings
// @Description Get tenant/organization settings
// @Tags settings
// @Security Bearer
// @Produce json
// @Success 200 {object} map[string]interface{} "tenant settings"
// @Failure 401 {object} map[string]interface{} "invalid tenant/auth"
// @Failure 404 {object} map[string]interface{} "settings not found"
// @Failure 500 {object} map[string]interface{} "internal error"
// @Router /settings/tenant [get]
func (h *SettingsHandler) GetTenantSettings(c echo.Context) error {
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

	settings, err := h.service.GetTenantSettings(c.Request().Context(), tenantID)
	if err != nil {
		// If settings don't exist, try to initialize them
		if err.Error() == "sql: no rows in result set" {
			// Get tenant name from context or database
			tenantName := "Default Company"
			if tenantInfo := c.Get("tenant_info"); tenantInfo != nil {
				if info, ok := tenantInfo.(map[string]interface{}); ok {
					if name, exists := info["name"].(string); exists {
						tenantName = name
					}
				}
			}

			settings, err = h.service.InitializeTenantSettings(c.Request().Context(), tenantID, tenantName)
			if err != nil {
				return c.JSON(http.StatusInternalServerError, map[string]any{
					"success": false,
					"error": map[string]any{
						"code":    http.StatusInternalServerError,
						"message": "failed to initialize tenant settings",
					},
				})
			}
		} else {
			return c.JSON(http.StatusInternalServerError, map[string]any{
				"success": false,
				"error": map[string]any{
					"code":    http.StatusInternalServerError,
					"message": err.Error(),
				},
			})
		}
	}

	return c.JSON(http.StatusOK, map[string]any{
		"success": true,
		"data":    settings,
	})
}

// UpdateTenantSettings godoc
// @Summary Update tenant settings
// @Description Update tenant/organization settings
// @Tags settings
// @Security Bearer
// @Accept json
// @Produce json
// @Param payload body UpdateTenantSettingsRequest true "Update tenant settings payload"
// @Success 200 {object} map[string]interface{} "updated tenant settings"
// @Failure 400 {object} map[string]interface{} "invalid request body"
// @Failure 401 {object} map[string]interface{} "invalid tenant/auth"
// @Failure 500 {object} map[string]interface{} "internal error"
// @Router /settings/tenant [put]
func (h *SettingsHandler) UpdateTenantSettings(c echo.Context) error {
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

	var req UpdateTenantSettingsRequest
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
	if req.CompanyName == "" {
		return c.JSON(http.StatusBadRequest, map[string]any{
			"success": false,
			"error": map[string]any{
				"code":    http.StatusBadRequest,
				"message": "company name is required",
			},
		})
	}

	params := TenantSettingsParams{
		TenantID:         tenantID,
		CompanyName:      req.CompanyName,
		CompanyLogoURL:   req.CompanyLogoURL,
		CompanyAddress:   req.CompanyAddress,
		CompanyPhone:     req.CompanyPhone,
		CompanyEmail:     req.CompanyEmail,
		Timezone:         req.Timezone,
		CurrencyCode:     req.CurrencyCode,
		DateFormat:       req.DateFormat,
		Language:         req.Language,
		FiscalYearStart:  req.FiscalYearStart,
		TaxID:            req.TaxID,
		WebsiteURL:       req.WebsiteURL,
	}

	settings, err := h.service.UpsertTenantSettings(c.Request().Context(), params)
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
		"data":    settings,
		"message": "Tenant settings updated successfully",
	})
}

// GetNotificationSettings godoc
// @Summary Get notification preferences
// @Description Get notification preferences for the authenticated user
// @Tags settings
// @Security Bearer
// @Produce json
// @Success 200 {object} map[string]interface{} "notification settings"
// @Failure 401 {object} map[string]interface{} "invalid tenant/auth"
// @Failure 404 {object} map[string]interface{} "settings not found"
// @Failure 500 {object} map[string]interface{} "internal error"
// @Router /settings/notifications [get]
func (h *SettingsHandler) GetNotificationSettings(c echo.Context) error {
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

	userStr, _ := c.Get("user_id").(string)
	userID, err := uuid.Parse(userStr)
	if err != nil || userStr == "" {
		return c.JSON(http.StatusUnauthorized, map[string]any{
			"success": false,
			"error": map[string]any{
				"code":    http.StatusUnauthorized,
				"message": "invalid user",
			},
		})
	}

	settings, err := h.service.GetNotificationSettings(c.Request().Context(), tenantID, userID)
	if err != nil {
		// If settings don't exist, try to initialize them
		if err.Error() == "sql: no rows in result set" {
			settings, err = h.service.InitializeNotificationSettings(c.Request().Context(), tenantID, userID)
			if err != nil {
				return c.JSON(http.StatusInternalServerError, map[string]any{
					"success": false,
					"error": map[string]any{
						"code":    http.StatusInternalServerError,
						"message": "failed to initialize notification settings",
					},
				})
			}
		} else {
			return c.JSON(http.StatusInternalServerError, map[string]any{
				"success": false,
				"error": map[string]any{
					"code":    http.StatusInternalServerError,
					"message": err.Error(),
				},
			})
		}
	}

	return c.JSON(http.StatusOK, map[string]any{
		"success": true,
		"data":    settings,
	})
}

// UpdateNotificationSettings godoc
// @Summary Update notification preferences
// @Description Update notification preferences for the authenticated user
// @Tags settings
// @Security Bearer
// @Accept json
// @Produce json
// @Param payload body UpdateNotificationSettingsRequest true "Update notification settings payload"
// @Success 200 {object} map[string]interface{} "updated notification settings"
// @Failure 400 {object} map[string]interface{} "invalid request body"
// @Failure 401 {object} map[string]interface{} "invalid tenant/auth"
// @Failure 500 {object} map[string]interface{} "internal error"
// @Router /settings/notifications [put]
func (h *SettingsHandler) UpdateNotificationSettings(c echo.Context) error {
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

	userStr, _ := c.Get("user_id").(string)
	userID, err := uuid.Parse(userStr)
	if err != nil || userStr == "" {
		return c.JSON(http.StatusUnauthorized, map[string]any{
			"success": false,
			"error": map[string]any{
				"code":    http.StatusUnauthorized,
				"message": "invalid user",
			},
		})
	}

	var req UpdateNotificationSettingsRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]any{
			"success": false,
			"error": map[string]any{
				"code":    http.StatusBadRequest,
				"message": "invalid request body",
			},
		})
	}

	params := NotificationSettingsParams{
		TenantID:           tenantID,
		UserID:             userID,
		EmailNotifications: req.EmailNotifications,
		SMSNotifications:   req.SMSNotifications,
		PushNotifications:  req.PushNotifications,
		LowStockAlerts:     req.LowStockAlerts,
		ExpiryAlerts:       req.ExpiryAlerts,
		OrderUpdates:       req.OrderUpdates,
		PaymentReminders:   req.PaymentReminders,
		MarketingEmails:    req.MarketingEmails,
		WeeklyReports:      req.WeeklyReports,
	}

	settings, err := h.service.UpsertNotificationSettings(c.Request().Context(), params)
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
		"data":    settings,
		"message": "Notification settings updated successfully",
	})
}

// Request/Response DTOs

type UpdateTenantSettingsRequest struct {
	CompanyName     string  `json:"company_name" validate:"required"`
	CompanyLogoURL  *string `json:"company_logo_url"`
	CompanyAddress  *string `json:"company_address"`
	CompanyPhone    *string `json:"company_phone"`
	CompanyEmail    *string `json:"company_email"`
	Timezone        *string `json:"timezone"`
	CurrencyCode    *string `json:"currency_code"`
	DateFormat      *string `json:"date_format"`
	Language        *string `json:"language"`
	FiscalYearStart *int    `json:"fiscal_year_start"`
	TaxID           *string `json:"tax_id"`
	WebsiteURL      *string `json:"website_url"`
}

type UpdateNotificationSettingsRequest struct {
	EmailNotifications *bool `json:"email_notifications"`
	SMSNotifications   *bool `json:"sms_notifications"`
	PushNotifications  *bool `json:"push_notifications"`
	LowStockAlerts     *bool `json:"low_stock_alerts"`
	ExpiryAlerts       *bool `json:"expiry_alerts"`
	OrderUpdates       *bool `json:"order_updates"`
	PaymentReminders   *bool `json:"payment_reminders"`
	MarketingEmails    *bool `json:"marketing_emails"`
	WeeklyReports      *bool `json:"weekly_reports"`
}