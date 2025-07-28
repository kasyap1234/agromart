package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Tenant struct {
	ID                 uuid.UUID      `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	Name               string         `json:"name" gorm:"not null"`
	Email              string         `json:"email" gorm:"not null"`
	Phone              string         `json:"phone" gorm:"not null"`
	Address            *string        `json:"address,omitempty"`
	RegistrationNumber *string        `json:"registration_number,omitempty"`
	IsActive           bool           `json:"is_active" gorm:"default:true;not null"`
	CreatedAt          time.Time      `json:"created_at" gorm:"default:now();not null"`
	DeletedAt          gorm.DeletedAt `json:"-" gorm:"index"`

	// Relationships
	Users          []User          `json:"users,omitempty" gorm:"foreignKey:TenantID;constraint:OnDelete:CASCADE"`
	Products       []Product       `json:"products,omitempty" gorm:"foreignKey:TenantID;constraint:OnDelete:CASCADE"`
	Units          []Unit          `json:"units,omitempty" gorm:"foreignKey:TenantID;constraint:OnDelete:CASCADE"`
	Suppliers      []Supplier      `json:"suppliers,omitempty" gorm:"foreignKey:TenantID;constraint:OnDelete:CASCADE"`
	Customers      []Customer      `json:"customers,omitempty" gorm:"foreignKey:TenantID;constraint:OnDelete:CASCADE"`
	Locations      []Location      `json:"locations,omitempty" gorm:"foreignKey:TenantID;constraint:OnDelete:CASCADE"`
	PurchaseOrders []PurchaseOrder `json:"purchase_orders,omitempty" gorm:"foreignKey:TenantID;constraint:OnDelete:CASCADE"`
	SalesOrders    []SalesOrder    `json:"sales_orders,omitempty" gorm:"foreignKey:TenantID;constraint:OnDelete:CASCADE"`
}
