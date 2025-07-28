package models

import (
	"time"

	"github.com/google/uuid"
)

type Customer struct {
	ID            uuid.UUID `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	TenantID      uuid.UUID `json:"tenant_id" gorm:"type:uuid;not null;index"`
	Name          string    `json:"name" gorm:"not null"`
	ContactPerson *string   `json:"contact_person,omitempty"`
	Email         *string   `json:"email,omitempty"`
	Phone         *string   `json:"phone,omitempty"`
	Address       *string   `json:"address,omitempty"`
	PaymentMode   *string   `json:"payment_mode,omitempty"`
	IsActive      *bool     `json:"is_active" gorm:"default:true"`
	CreatedAt     time.Time `json:"created_at" gorm:"default:now();not null"`
	UpdatedAt     time.Time `json:"updated_at" gorm:"default:now();not null"`

	// Relationships
	Tenant      *Tenant      `gorm:"foreignKey:TenantID;constraint:OnDelete:CASCADE"`
	SalesOrders []SalesOrder `json:"sales_orders,omitempty" gorm:"foreignKey:CustomerID"`
}
