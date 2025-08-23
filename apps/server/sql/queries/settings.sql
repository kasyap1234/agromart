-- name: CreateTenantSettings :one
INSERT INTO tenant_settings (
    tenant_id, company_name, company_logo_url, company_address,
    company_phone, company_email, timezone, currency_code,
    date_format, language, fiscal_year_start, tax_id, website_url
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
) RETURNING *;

-- name: GetTenantSettings :one
SELECT * FROM tenant_settings
WHERE tenant_id = $1;

-- name: UpdateTenantSettings :one
UPDATE tenant_settings
SET company_name = $2,
    company_logo_url = $3,
    company_address = $4,
    company_phone = $5,
    company_email = $6,
    timezone = $7,
    currency_code = $8,
    date_format = $9,
    language = $10,
    fiscal_year_start = $11,
    tax_id = $12,
    website_url = $13,
    updated_at = NOW()
WHERE tenant_id = $1
RETURNING *;

-- name: UpsertTenantSettings :one
INSERT INTO tenant_settings (
    tenant_id, company_name, company_logo_url, company_address,
    company_phone, company_email, timezone, currency_code,
    date_format, language, fiscal_year_start, tax_id, website_url
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
)
ON CONFLICT (tenant_id)
DO UPDATE SET
    company_name = EXCLUDED.company_name,
    company_logo_url = EXCLUDED.company_logo_url,
    company_address = EXCLUDED.company_address,
    company_phone = EXCLUDED.company_phone,
    company_email = EXCLUDED.company_email,
    timezone = EXCLUDED.timezone,
    currency_code = EXCLUDED.currency_code,
    date_format = EXCLUDED.date_format,
    language = EXCLUDED.language,
    fiscal_year_start = EXCLUDED.fiscal_year_start,
    tax_id = EXCLUDED.tax_id,
    website_url = EXCLUDED.website_url,
    updated_at = NOW()
RETURNING *;

-- name: CreateNotificationSettings :one
INSERT INTO notification_settings (
    tenant_id, user_id, email_notifications, sms_notifications,
    push_notifications, low_stock_alerts, expiry_alerts,
    order_updates, payment_reminders, marketing_emails, weekly_reports
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
) RETURNING *;

-- name: GetNotificationSettings :one
SELECT * FROM notification_settings
WHERE tenant_id = $1 AND user_id = $2;

-- name: UpdateNotificationSettings :one
UPDATE notification_settings
SET email_notifications = $3,
    sms_notifications = $4,
    push_notifications = $5,
    low_stock_alerts = $6,
    expiry_alerts = $7,
    order_updates = $8,
    payment_reminders = $9,
    marketing_emails = $10,
    weekly_reports = $11,
    updated_at = NOW()
WHERE tenant_id = $1 AND user_id = $2
RETURNING *;

-- name: UpsertNotificationSettings :one
INSERT INTO notification_settings (
    tenant_id, user_id, email_notifications, sms_notifications,
    push_notifications, low_stock_alerts, expiry_alerts,
    order_updates, payment_reminders, marketing_emails, weekly_reports
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
)
ON CONFLICT (tenant_id, user_id)
DO UPDATE SET
    email_notifications = EXCLUDED.email_notifications,
    sms_notifications = EXCLUDED.sms_notifications,
    push_notifications = EXCLUDED.push_notifications,
    low_stock_alerts = EXCLUDED.low_stock_alerts,
    expiry_alerts = EXCLUDED.expiry_alerts,
    order_updates = EXCLUDED.order_updates,
    payment_reminders = EXCLUDED.payment_reminders,
    marketing_emails = EXCLUDED.marketing_emails,
    weekly_reports = EXCLUDED.weekly_reports,
    updated_at = NOW()
RETURNING *;

-- name: ListNotificationSettingsByTenant :many
SELECT * FROM notification_settings
WHERE tenant_id = $1
ORDER BY created_at DESC
LIMIT $2 OFFSET $3;