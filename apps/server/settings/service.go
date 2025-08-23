package settings

import (
	"context"
	"database/sql"

	"agromart2/db"
	"github.com/google/uuid"
)

type SettingsService struct {
	db *db.Queries
}

func NewSettingsService(db *db.Queries) *SettingsService {
	return &SettingsService{db: db}
}

// Tenant Settings

type TenantSettingsParams struct {
	TenantID         uuid.UUID
	CompanyName      string
	CompanyLogoURL   *string
	CompanyAddress   *string
	CompanyPhone     *string
	CompanyEmail     *string
	Timezone         *string
	CurrencyCode     *string
	DateFormat       *string
	Language         *string
	FiscalYearStart  *int
	TaxID            *string
	WebsiteURL       *string
}

func (s *SettingsService) CreateTenantSettings(ctx context.Context, params TenantSettingsParams) (db.TenantSetting, error) {
	// Convert pointers to values for SQLC
	var companyLogoURL, companyAddress, companyPhone, companyEmail, timezone, currencyCode, dateFormat, language, taxID, websiteURL sql.NullString
	var fiscalYearStart sql.NullInt32

	if params.CompanyLogoURL != nil {
		companyLogoURL = sql.NullString{String: *params.CompanyLogoURL, Valid: true}
	}
	if params.CompanyAddress != nil {
		companyAddress = sql.NullString{String: *params.CompanyAddress, Valid: true}
	}
	if params.CompanyPhone != nil {
		companyPhone = sql.NullString{String: *params.CompanyPhone, Valid: true}
	}
	if params.CompanyEmail != nil {
		companyEmail = sql.NullString{String: *params.CompanyEmail, Valid: true}
	}
	if params.Timezone != nil {
		timezone = sql.NullString{String: *params.Timezone, Valid: true}
	}
	if params.CurrencyCode != nil {
		currencyCode = sql.NullString{String: *params.CurrencyCode, Valid: true}
	}
	if params.DateFormat != nil {
		dateFormat = sql.NullString{String: *params.DateFormat, Valid: true}
	}
	if params.Language != nil {
		language = sql.NullString{String: *params.Language, Valid: true}
	}
	if params.FiscalYearStart != nil {
		fiscalYearStart = sql.NullInt32{Int32: int32(*params.FiscalYearStart), Valid: true}
	}
	if params.TaxID != nil {
		taxID = sql.NullString{String: *params.TaxID, Valid: true}
	}
	if params.WebsiteURL != nil {
		websiteURL = sql.NullString{String: *params.WebsiteURL, Valid: true}
	}

	return s.db.CreateTenantSettings(ctx, db.CreateTenantSettingsParams{
		TenantID:        params.TenantID,
		CompanyName:     params.CompanyName,
		CompanyLogoUrl:  companyLogoURL,
		CompanyAddress:  companyAddress,
		CompanyPhone:    companyPhone,
		CompanyEmail:    companyEmail,
		Timezone:        timezone,
		CurrencyCode:    currencyCode,
		DateFormat:      dateFormat,
		Language:        language,
		FiscalYearStart: fiscalYearStart,
		TaxID:           taxID,
		WebsiteUrl:      websiteURL,
	})
}

func (s *SettingsService) GetTenantSettings(ctx context.Context, tenantID uuid.UUID) (db.TenantSetting, error) {
	return s.db.GetTenantSettings(ctx, tenantID)
}

func (s *SettingsService) UpdateTenantSettings(ctx context.Context, params TenantSettingsParams) (db.TenantSetting, error) {
	// Convert pointers to values for SQLC
	var companyLogoURL, companyAddress, companyPhone, companyEmail, timezone, currencyCode, dateFormat, language, taxID, websiteURL sql.NullString
	var fiscalYearStart sql.NullInt32

	if params.CompanyLogoURL != nil {
		companyLogoURL = sql.NullString{String: *params.CompanyLogoURL, Valid: true}
	}
	if params.CompanyAddress != nil {
		companyAddress = sql.NullString{String: *params.CompanyAddress, Valid: true}
	}
	if params.CompanyPhone != nil {
		companyPhone = sql.NullString{String: *params.CompanyPhone, Valid: true}
	}
	if params.CompanyEmail != nil {
		companyEmail = sql.NullString{String: *params.CompanyEmail, Valid: true}
	}
	if params.Timezone != nil {
		timezone = sql.NullString{String: *params.Timezone, Valid: true}
	}
	if params.CurrencyCode != nil {
		currencyCode = sql.NullString{String: *params.CurrencyCode, Valid: true}
	}
	if params.DateFormat != nil {
		dateFormat = sql.NullString{String: *params.DateFormat, Valid: true}
	}
	if params.Language != nil {
		language = sql.NullString{String: *params.Language, Valid: true}
	}
	if params.FiscalYearStart != nil {
		fiscalYearStart = sql.NullInt32{Int32: int32(*params.FiscalYearStart), Valid: true}
	}
	if params.TaxID != nil {
		taxID = sql.NullString{String: *params.TaxID, Valid: true}
	}
	if params.WebsiteURL != nil {
		websiteURL = sql.NullString{String: *params.WebsiteURL, Valid: true}
	}

	return s.db.UpdateTenantSettings(ctx, db.UpdateTenantSettingsParams{
		TenantID:        params.TenantID,
		CompanyName:     params.CompanyName,
		CompanyLogoUrl:  companyLogoURL,
		CompanyAddress:  companyAddress,
		CompanyPhone:    companyPhone,
		CompanyEmail:    companyEmail,
		Timezone:        timezone,
		CurrencyCode:    currencyCode,
		DateFormat:      dateFormat,
		Language:        language,
		FiscalYearStart: fiscalYearStart,
		TaxID:           taxID,
		WebsiteUrl:      websiteURL,
	})
}

func (s *SettingsService) UpsertTenantSettings(ctx context.Context, params TenantSettingsParams) (db.TenantSetting, error) {
	// Convert pointers to values for SQLC
	var companyLogoURL, companyAddress, companyPhone, companyEmail, timezone, currencyCode, dateFormat, language, taxID, websiteURL sql.NullString
	var fiscalYearStart sql.NullInt32

	if params.CompanyLogoURL != nil {
		companyLogoURL = sql.NullString{String: *params.CompanyLogoURL, Valid: true}
	}
	if params.CompanyAddress != nil {
		companyAddress = sql.NullString{String: *params.CompanyAddress, Valid: true}
	}
	if params.CompanyPhone != nil {
		companyPhone = sql.NullString{String: *params.CompanyPhone, Valid: true}
	}
	if params.CompanyEmail != nil {
		companyEmail = sql.NullString{String: *params.CompanyEmail, Valid: true}
	}
	if params.Timezone != nil {
		timezone = sql.NullString{String: *params.Timezone, Valid: true}
	}
	if params.CurrencyCode != nil {
		currencyCode = sql.NullString{String: *params.CurrencyCode, Valid: true}
	}
	if params.DateFormat != nil {
		dateFormat = sql.NullString{String: *params.DateFormat, Valid: true}
	}
	if params.Language != nil {
		language = sql.NullString{String: *params.Language, Valid: true}
	}
	if params.FiscalYearStart != nil {
		fiscalYearStart = sql.NullInt32{Int32: int32(*params.FiscalYearStart), Valid: true}
	}
	if params.TaxID != nil {
		taxID = sql.NullString{String: *params.TaxID, Valid: true}
	}
	if params.WebsiteURL != nil {
		websiteURL = sql.NullString{String: *params.WebsiteURL, Valid: true}
	}

	return s.db.UpsertTenantSettings(ctx, db.UpsertTenantSettingsParams{
		TenantID:        params.TenantID,
		CompanyName:     params.CompanyName,
		CompanyLogoUrl:  companyLogoURL,
		CompanyAddress:  companyAddress,
		CompanyPhone:    companyPhone,
		CompanyEmail:    companyEmail,
		Timezone:        timezone,
		CurrencyCode:    currencyCode,
		DateFormat:      dateFormat,
		Language:        language,
		FiscalYearStart: fiscalYearStart,
		TaxID:           taxID,
		WebsiteUrl:      websiteURL,
	})
}

// Notification Settings

type NotificationSettingsParams struct {
	TenantID           uuid.UUID
	UserID             uuid.UUID
	EmailNotifications *bool
	SMSNotifications   *bool
	PushNotifications  *bool
	LowStockAlerts     *bool
	ExpiryAlerts       *bool
	OrderUpdates       *bool
	PaymentReminders   *bool
	MarketingEmails    *bool
	WeeklyReports      *bool
}

func (s *SettingsService) CreateNotificationSettings(ctx context.Context, params NotificationSettingsParams) (db.NotificationSetting, error) {
	// Convert pointers to values for SQLC
	var emailNotifications, smsNotifications, pushNotifications, lowStockAlerts, expiryAlerts, orderUpdates, paymentReminders, marketingEmails, weeklyReports sql.NullBool

	if params.EmailNotifications != nil {
		emailNotifications = sql.NullBool{Bool: *params.EmailNotifications, Valid: true}
	}
	if params.SMSNotifications != nil {
		smsNotifications = sql.NullBool{Bool: *params.SMSNotifications, Valid: true}
	}
	if params.PushNotifications != nil {
		pushNotifications = sql.NullBool{Bool: *params.PushNotifications, Valid: true}
	}
	if params.LowStockAlerts != nil {
		lowStockAlerts = sql.NullBool{Bool: *params.LowStockAlerts, Valid: true}
	}
	if params.ExpiryAlerts != nil {
		expiryAlerts = sql.NullBool{Bool: *params.ExpiryAlerts, Valid: true}
	}
	if params.OrderUpdates != nil {
		orderUpdates = sql.NullBool{Bool: *params.OrderUpdates, Valid: true}
	}
	if params.PaymentReminders != nil {
		paymentReminders = sql.NullBool{Bool: *params.PaymentReminders, Valid: true}
	}
	if params.MarketingEmails != nil {
		marketingEmails = sql.NullBool{Bool: *params.MarketingEmails, Valid: true}
	}
	if params.WeeklyReports != nil {
		weeklyReports = sql.NullBool{Bool: *params.WeeklyReports, Valid: true}
	}

	return s.db.CreateNotificationSettings(ctx, db.CreateNotificationSettingsParams{
		TenantID:           params.TenantID,
		UserID:             params.UserID,
		EmailNotifications: emailNotifications,
		SmsNotifications:   smsNotifications,
		PushNotifications:  pushNotifications,
		LowStockAlerts:     lowStockAlerts,
		ExpiryAlerts:       expiryAlerts,
		OrderUpdates:       orderUpdates,
		PaymentReminders:   paymentReminders,
		MarketingEmails:    marketingEmails,
		WeeklyReports:      weeklyReports,
	})
}

func (s *SettingsService) GetNotificationSettings(ctx context.Context, tenantID, userID uuid.UUID) (db.NotificationSetting, error) {
	return s.db.GetNotificationSettings(ctx, db.GetNotificationSettingsParams{
		TenantID: tenantID,
		UserID:   userID,
	})
}

func (s *SettingsService) UpdateNotificationSettings(ctx context.Context, params NotificationSettingsParams) (db.NotificationSetting, error) {
	// Convert pointers to values for SQLC
	var emailNotifications, smsNotifications, pushNotifications, lowStockAlerts, expiryAlerts, orderUpdates, paymentReminders, marketingEmails, weeklyReports sql.NullBool

	if params.EmailNotifications != nil {
		emailNotifications = sql.NullBool{Bool: *params.EmailNotifications, Valid: true}
	}
	if params.SMSNotifications != nil {
		smsNotifications = sql.NullBool{Bool: *params.SMSNotifications, Valid: true}
	}
	if params.PushNotifications != nil {
		pushNotifications = sql.NullBool{Bool: *params.PushNotifications, Valid: true}
	}
	if params.LowStockAlerts != nil {
		lowStockAlerts = sql.NullBool{Bool: *params.LowStockAlerts, Valid: true}
	}
	if params.ExpiryAlerts != nil {
		expiryAlerts = sql.NullBool{Bool: *params.ExpiryAlerts, Valid: true}
	}
	if params.OrderUpdates != nil {
		orderUpdates = sql.NullBool{Bool: *params.OrderUpdates, Valid: true}
	}
	if params.PaymentReminders != nil {
		paymentReminders = sql.NullBool{Bool: *params.PaymentReminders, Valid: true}
	}
	if params.MarketingEmails != nil {
		marketingEmails = sql.NullBool{Bool: *params.MarketingEmails, Valid: true}
	}
	if params.WeeklyReports != nil {
		weeklyReports = sql.NullBool{Bool: *params.WeeklyReports, Valid: true}
	}

	return s.db.UpdateNotificationSettings(ctx, db.UpdateNotificationSettingsParams{
		TenantID:           params.TenantID,
		UserID:             params.UserID,
		EmailNotifications: emailNotifications,
		SmsNotifications:   smsNotifications,
		PushNotifications:  pushNotifications,
		LowStockAlerts:     lowStockAlerts,
		ExpiryAlerts:       expiryAlerts,
		OrderUpdates:       orderUpdates,
		PaymentReminders:   paymentReminders,
		MarketingEmails:    marketingEmails,
		WeeklyReports:      weeklyReports,
	})
}

func (s *SettingsService) UpsertNotificationSettings(ctx context.Context, params NotificationSettingsParams) (db.NotificationSetting, error) {
	// Convert pointers to values for SQLC
	var emailNotifications, smsNotifications, pushNotifications, lowStockAlerts, expiryAlerts, orderUpdates, paymentReminders, marketingEmails, weeklyReports sql.NullBool

	if params.EmailNotifications != nil {
		emailNotifications = sql.NullBool{Bool: *params.EmailNotifications, Valid: true}
	}
	if params.SMSNotifications != nil {
		smsNotifications = sql.NullBool{Bool: *params.SMSNotifications, Valid: true}
	}
	if params.PushNotifications != nil {
		pushNotifications = sql.NullBool{Bool: *params.PushNotifications, Valid: true}
	}
	if params.LowStockAlerts != nil {
		lowStockAlerts = sql.NullBool{Bool: *params.LowStockAlerts, Valid: true}
	}
	if params.ExpiryAlerts != nil {
		expiryAlerts = sql.NullBool{Bool: *params.ExpiryAlerts, Valid: true}
	}
	if params.OrderUpdates != nil {
		orderUpdates = sql.NullBool{Bool: *params.OrderUpdates, Valid: true}
	}
	if params.PaymentReminders != nil {
		paymentReminders = sql.NullBool{Bool: *params.PaymentReminders, Valid: true}
	}
	if params.MarketingEmails != nil {
		marketingEmails = sql.NullBool{Bool: *params.MarketingEmails, Valid: true}
	}
	if params.WeeklyReports != nil {
		weeklyReports = sql.NullBool{Bool: *params.WeeklyReports, Valid: true}
	}

	return s.db.UpsertNotificationSettings(ctx, db.UpsertNotificationSettingsParams{
		TenantID:           params.TenantID,
		UserID:             params.UserID,
		EmailNotifications: emailNotifications,
		SmsNotifications:   smsNotifications,
		PushNotifications:  pushNotifications,
		LowStockAlerts:     lowStockAlerts,
		ExpiryAlerts:       expiryAlerts,
		OrderUpdates:       orderUpdates,
		PaymentReminders:   paymentReminders,
		MarketingEmails:    marketingEmails,
		WeeklyReports:      weeklyReports,
	})
}

func (s *SettingsService) ListNotificationSettingsByTenant(ctx context.Context, tenantID uuid.UUID, limit, offset int) ([]db.NotificationSetting, error) {
	return s.db.ListNotificationSettingsByTenant(ctx, db.ListNotificationSettingsByTenantParams{
		TenantID: tenantID,
		Limit:    int32(limit),
		Offset:   int32(offset),
	})
}

// Helper functions for default values
func getDefaultTenantSettings() TenantSettingsParams {
	defaultCompanyName := "Your Company"
	defaultTimezone := "UTC"
	defaultCurrency := "USD"
	defaultDateFormat := "YYYY-MM-DD"
	defaultLanguage := "en"
	defaultFiscalYearStart := 1

	return TenantSettingsParams{
		CompanyName:     defaultCompanyName,
		Timezone:        &defaultTimezone,
		CurrencyCode:    &defaultCurrency,
		DateFormat:      &defaultDateFormat,
		Language:        &defaultLanguage,
		FiscalYearStart: &defaultFiscalYearStart,
	}
}

func getDefaultNotificationSettings(tenantID, userID uuid.UUID) NotificationSettingsParams {
	defaultTrue := true
	defaultFalse := false

	return NotificationSettingsParams{
		TenantID:           tenantID,
		UserID:             userID,
		EmailNotifications: &defaultTrue,
		SMSNotifications:   &defaultFalse,
		PushNotifications:  &defaultTrue,
		LowStockAlerts:     &defaultTrue,
		ExpiryAlerts:       &defaultTrue,
		OrderUpdates:       &defaultTrue,
		PaymentReminders:   &defaultTrue,
		MarketingEmails:    &defaultFalse,
		WeeklyReports:      &defaultTrue,
	}
}

// Initialize default settings if they don't exist
func (s *SettingsService) InitializeTenantSettings(ctx context.Context, tenantID uuid.UUID, companyName string) (db.TenantSetting, error) {
	// Try to get existing settings first
	existing, err := s.db.GetTenantSettings(ctx, tenantID)
	if err == nil {
		return existing, nil
	}

	// If not found, create with defaults
	defaults := getDefaultTenantSettings()
	defaults.TenantID = tenantID
	defaults.CompanyName = companyName

	return s.CreateTenantSettings(ctx, defaults)
}

func (s *SettingsService) InitializeNotificationSettings(ctx context.Context, tenantID, userID uuid.UUID) (db.NotificationSetting, error) {
	// Try to get existing settings first
	existing, err := s.db.GetNotificationSettings(ctx, db.GetNotificationSettingsParams{
		TenantID: tenantID,
		UserID:   userID,
	})
	if err == nil {
		return existing, nil
	}

	// If not found, create with defaults
	defaults := getDefaultNotificationSettings(tenantID, userID)

	return s.CreateNotificationSettings(ctx, defaults)
}