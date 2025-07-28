package models

import (
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

type Product struct {
	ID           uuid.UUID       `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	TenantID     uuid.UUID       `json:"tenant_id" gorm:"type:uuid;not null;index"`
	SKU          string          `json:"sku" gorm:"not null;uniqueIndex:idx_products_tenant_sku,composite:tenant_id"`
	Name         string          `json:"name" gorm:"not null;index"`
	Price        decimal.Decimal `json:"price" gorm:"type:numeric(12,2);not null"`
	Description  *string         `json:"description,omitempty"`
	ImageURL     *string         `json:"image_url,omitempty"`
	Brand        *string         `json:"brand,omitempty" gorm:"index"`
	UnitID       uuid.UUID       `json:"unit_id" gorm:"type:uuid;not null;index"`
	PricePerUnit *decimal.Decimal `json:"price_per_unit,omitempty" gorm:"type:numeric(10,2)"`
	GSTPercent   *decimal.Decimal `json:"gst_percent,omitempty" gorm:"type:numeric(5,2)"`
	CreatedAt    time.Time       `json:"created_at" gorm:"default:now();not null"`

	// Relationships
	Tenant    *Tenant   `gorm:"foreignKey:TenantID;constraint:OnDelete:CASCADE"`
	Unit      *Unit     `gorm:"foreignKey:UnitID"`
	Batches   []Batch   `json:"batches,omitempty" gorm:"foreignKey:ProductID"`
	Inventory []Inventory `json:"inventory,omitempty" gorm:"foreignKey:ProductID"`
}
