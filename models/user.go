package models

import (
	"time"

	"github.com/google/uuid"
)

type User struct {
	ID            uuid.UUID `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	Name          string    `json:"name" gorm:"not null"`
	Email         string    `json:"email" gorm:"unique;not null"`
	Password      string    `json:"password" gorm:"not null"`
	Phone         string    `json:"phone" gorm:"not null"`
	TenantID      uuid.UUID `json:"tenant_id" gorm:"type:uuid;not null;index"`
	Role          string    `json:"role" gorm:"not null;type:user_role;default:'user'"`
	EmailVerified *bool     `json:"email_verified" gorm:"default:false"`
	IsActive      *bool     `json:"is_active" gorm:"default:true"`
	CreatedAt     time.Time `json:"created_at" gorm:"default:now();not null"`

	// Relationships
	Tenant *Tenant `gorm:"foreignKey:TenantID;constraint:OnDelete:CASCADE"`
}
