package handler

import (
	"github.com/golang-jwt/jwt/v5"
	"github.com/kasyap1234/agromart/apps/server/models"
)

type RegisterRequest struct {
	Name     string      `json:"name" validate:"required"`
	Email    string      `json:"email" validate: "required"`
	Password string      `json:"password" validate:"min=6"`
	Role     models.Role `json:"role" validate:"required"`
	Company  string      `json:"company" validate:"required"`
}

type LoginRequest struct {
	Email    string      `json:"email" validate:"required"`
	Password string      `json:"password" validate:"min=6"`
	Role     models.Role `json:"role" validate:"required"`
}

type CustomClaims struct {
	ID   uint        `json:"id"`
	Role models.Role `json:"role"`
	jwt.RegisteredClaims
}
