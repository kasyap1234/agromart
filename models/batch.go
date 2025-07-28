package models

import (
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

type Batch struct {
	ID          uuid.UUID       `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	TenantID    uuid.UUID       `json:"tenant_id" gorm:"type:uuid;not null;index"`
	ProductID   uuid.UUID       `json:"product_id" gorm:"type:uuid;not null;index"`
	BatchNumber string          `json:"batch_number" gorm:"not null"`
	ExpiryDate  *time.Time      `json:"expiry_date,omitempty" gorm:"type:date"`
	Cost        decimal.Decimal `json:"cost" gorm:"type:numeric"`
	CreatedAt   time.Time       `json:"created_at" gorm:"default:now();not null"`

	// Relationships
	Tenant  *Tenant `gorm:"foreignKey:TenantID;constraint:OnDelete:CASCADE"`
	Product *Product `gorm:"foreignKey:ProductID;constraint:OnDelete:CASCADE"`
	Inventory []Inventory `json:"inventory,omitempty" gorm:"foreignKey:BatchID"`
}
