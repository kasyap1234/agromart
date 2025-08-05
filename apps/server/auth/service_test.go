package auth

import (
	"testing"
	"agromart2/internal/auth"
)

func TestJWT_Construct(t *testing.T) {
	secret := "devsecret"
	_ = auth.NewJWTService(secret)
}
