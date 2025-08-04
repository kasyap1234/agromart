package handler

import (
	"github.com/kasyap1234/agromart/apps/server/models"
)

type RegisterRequest struct {
	Name     string      `json:"name" validate:"required"`
	Email    string      `json:"email" validate: "required"`
	Password string      `json:"password" validate:"min=6"`
	Role     models.Role `json:"role" validate:"required"`
	Company  string      `json:"company" validate:"required"`
	
}
