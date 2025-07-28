package models

import (
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

type SalesOrder struct {
	ID                   uuid.UUID        `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	TenantID             uuid.UUID        `json:"tenant_id" gorm:"type:uuid;not null;index"`
	SONumber             string           `json:"so_number" gorm:"not null"`
	CustomerID           uuid.UUID        `json:"customer_id" gorm:"type:uuid;not null;index"`
	LocationID           uuid.UUID        `json:"location_id" gorm:"type:uuid;not null;index"`
	OrderDate            *time.Time       `json:"order_date,omitempty" gorm:"type:date"`
	ExpectedDeliveryDate *time.Time       `json:"expected_delivery_date,omitempty" gorm:"type:date"`
	ActualDeliveryDate   *time.Time       `json:"actual_delivery_date,omitempty" gorm:"type:date"`
	TotalAmount          *decimal.Decimal `json:"total_amount,omitempty" gorm:"type:numeric"`
	TaxAmount            *decimal.Decimal `json:"tax_amount,omitempty" gorm:"type:numeric"`
	DiscountAmount       *decimal.Decimal `json:"discount_amount,omitempty" gorm:"type:numeric"`
	FinalAmount          *decimal.Decimal `json:"final_amount,omitempty" gorm:"type:numeric"`
	Status               string           `json:"status" gorm:"not null;default:'pending'"`
	Notes                *string          `json:"notes,omitempty"`
	CreatedBy            uuid.UUID        `json:"created_by" gorm:"type:uuid;not null"`
	ApprovedBy           *uuid.UUID       `json:"approved_by,omitempty" gorm:"type:uuid"`
	ApprovedAt           *time.Time       `json:"approved_at,omitempty"`
	CreatedAt            time.Time        `json:"created_at" gorm:"default:now();not null"`
	UpdatedAt            time.Time        `json:"updated_at" gorm:"default:now();not null"`

	// Relationships
	Tenant         *Tenant         `gorm:"foreignKey:TenantID;constraint:OnDelete:CASCADE"`
	Customer       *Customer       `gorm:"foreignKey:CustomerID"`
	Location       *Location       `gorm:"foreignKey:LocationID"`
	Creator        *User           `gorm:"foreignKey:CreatedBy"`
	Approver       *User           `gorm:"foreignKey:ApprovedBy"`
	SalesOrderItems []SalesOrderItem `json:"items,omitempty" gorm:"foreignKey:SalesOrderID"`
}

type SalesOrderItem struct {
	ID              uuid.UUID        `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	TenantID        uuid.UUID        `json:"tenant_id" gorm:"type:uuid;not null;index"`
	SalesOrderID    uuid.UUID        `json:"sales_order_id" gorm:"type:uuid;not null;index"`
	ProductID       uuid.UUID        `json:"product_id" gorm:"type:uuid;not null;index"`
	BatchID         *uuid.UUID       `json:"batch_id,omitempty" gorm:"type:uuid"`
	QuantityOrdered decimal.Decimal  `json:"quantity_ordered" gorm:"type:numeric"`
	QuantityShipped *decimal.Decimal `json:"quantity_shipped,omitempty" gorm:"type:numeric"`
	UnitPrice       decimal.Decimal  `json:"unit_price" gorm:"type:numeric"`
	TotalPrice      decimal.Decimal  `json:"total_price" gorm:"type:numeric"`
	TaxPercent      *decimal.Decimal `json:"tax_percent,omitempty" gorm:"type:numeric"`
	DiscountPercent *decimal.Decimal `json:"discount_percent,omitempty" gorm:"type:numeric"`
	Notes           *string          `json:"notes,omitempty"`
	CreatedAt       time.Time        `json:"created_at" gorm:"default:now();not null"`
	UpdatedAt       time.Time        `json:"updated_at" gorm:"default:now();not null"`

	// Relationships
	Tenant     *Tenant     `gorm:"foreignKey:TenantID;constraint:OnDelete:CASCADE"`
	SalesOrder *SalesOrder `gorm:"foreignKey:SalesOrderID;constraint:OnDelete:CASCADE"`
	Product    *Product    `gorm:"foreignKey:ProductID"`
	Batch      *Batch      `gorm:"foreignKey:BatchID"`
}
