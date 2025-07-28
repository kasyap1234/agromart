package models

import (
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

type Inventory struct {
	ID        uuid.UUID       `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	TenantID  uuid.UUID       `json:"tenant_id" gorm:"type:uuid;not null;index"`
	ProductID uuid.UUID       `json:"product_id" gorm:"type:uuid;not null;index"`
	BatchID   uuid.UUID       `json:"batch_id" gorm:"type:uuid;not null;index"`
	Quantity  decimal.Decimal `json:"quantity" gorm:"type:numeric"`

	// Relationships
	Tenant  *Tenant  `gorm:"foreignKey:TenantID;constraint:OnDelete:CASCADE"`
	Product *Product `gorm:"foreignKey:ProductID;constraint:OnDelete:CASCADE"`
	Batch   *Batch   `gorm:"foreignKey:BatchID;constraint:OnDelete:CASCADE"`
}

type InventoryLog struct {
	ID              uuid.UUID       `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	TenantID        uuid.UUID       `json:"tenant_id" gorm:"type:uuid;not null;index"`
	ProductID       uuid.UUID       `json:"product_id" gorm:"type:uuid;not null;index"`
	BatchID         uuid.UUID       `json:"batch_id" gorm:"type:uuid;not null;index"`
	TransactionType string          `json:"transaction_type" gorm:"not null"`
	QuantityChange  decimal.Decimal `json:"quantity_change" gorm:"type:numeric"`
	TransactionDate time.Time       `json:"transaction_date" gorm:"default:now();not null"`
	Notes           *string         `json:"notes,omitempty"`
	ReferenceID     *uuid.UUID      `json:"reference_id,omitempty" gorm:"type:uuid"`

	// Relationships
	Tenant  *Tenant  `gorm:"foreignKey:TenantID;constraint:OnDelete:CASCADE"`
	Product *Product `gorm:"foreignKey:ProductID;constraint:OnDelete:CASCADE"`
	Batch   *Batch   `gorm:"foreignKey:BatchID;constraint:OnDelete:CASCADE"`
}
