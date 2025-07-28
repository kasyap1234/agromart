package models

import (
	"time"

	"github.com/google/uuid"
)

type Unit struct {
	ID           uuid.UUID `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	TenantID     uuid.UUID `json:"tenant_id" gorm:"type:uuid;not null;index"`
	Name         string    `json:"name" gorm:"not null"`
	Abbreviation string    `json:"abbreviation" gorm:"not null"`
	CreatedAt    time.Time `json:"created_at" gorm:"default:now();not null"`

	// Relationships
	Tenant   *Tenant   `gorm:"foreignKey:TenantID;constraint:OnDelete:CASCADE"`
	Products []Product `json:"products,omitempty" gorm:"foreignKey:UnitID"`
}
