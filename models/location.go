package models

import (
	"time"

	"github.com/google/uuid"
)

type Location struct {
	ID           uuid.UUID `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	TenantID     uuid.UUID `json:"tenant_id" gorm:"type:uuid;not null;index"`
	Name         string    `json:"name" gorm:"not null"`
	Address      *string   `json:"address,omitempty"`
	City         *string   `json:"city,omitempty"`
	State        *string   `json:"state,omitempty"`
	PostalCode   *string   `json:"postal_code,omitempty"`
	Country      *string   `json:"country,omitempty"`
	Phone        *string   `json:"phone,omitempty"`
	Email        *string   `json:"email,omitempty"`
	LocationType string    `json:"location_type" gorm:"not null"`
	IsActive     bool      `json:"is_active" gorm:"default:true;not null"`
	Notes        *string   `json:"notes,omitempty"`
	CreatedAt    time.Time `json:"created_at" gorm:"default:now();not null"`
	UpdatedAt    time.Time `json:"updated_at" gorm:"default:now();not null"`

	// Relationships
	Tenant         *Tenant         `gorm:"foreignKey:TenantID;constraint:OnDelete:CASCADE"`
	PurchaseOrders []PurchaseOrder `json:"purchase_orders,omitempty" gorm:"foreignKey:LocationID"`
	SalesOrders    []SalesOrder    `json:"sales_orders,omitempty" gorm:"foreignKey:LocationID"`
}
