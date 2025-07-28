package models

import (
	"github.com/google/uuid"
)

type Supplier struct {
	ID            uuid.UUID `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	TenantID      uuid.UUID `json:"tenant_id" gorm:"type:uuid;not null;index"`
	Name          string    `json:"name" gorm:"not null"`
	ContactPerson *string   `json:"contact_person,omitempty"`
	Email         *string   `json:"email,omitempty"`
	Phone         *string   `json:"phone,omitempty"`
	Address       *string   `json:"address,omitempty"`
	TaxID         *string   `json:"tax_id,omitempty"`
	PaymentMode   *string   `json:"payment_mode,omitempty"`
	IsActive      *bool     `json:"is_active" gorm:"default:true"`

	// Relationships
	Tenant         *Tenant         `gorm:"foreignKey:TenantID;constraint:OnDelete:CASCADE"`
	PurchaseOrders []PurchaseOrder `json:"purchase_orders,omitempty" gorm:"foreignKey:SupplierID"`
}
