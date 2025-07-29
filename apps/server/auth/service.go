package auth

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"agromart2/db"
	"agromart2/internal/utils"
	"golang.org/x/crypto/bcrypt"
)

type AuthService struct {
	queries   db.Querier
	jwtSecret string
}

type LoginRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required,min=6"`
}

type RegisterRequest struct {
	Name     string `json:"name" validate:"required,min=2"`
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required,min=8"`
	Phone    string `json:"phone" validate:"required"`
	Company  string `json:"company" validate:"required,min=2"`
}

type LoginResponse struct {
	Token        string    `json:"token"`
	RefreshToken string    `json:"refresh_token"`
	User         UserInfo  `json:"user"`
	Tenant       TenantInfo `json:"tenant"`
	ExpiresAt    time.Time `json:"expires_at"`
}

type UserInfo struct {
	ID       uuid.UUID `json:"id"`
	Name     string    `json:"name"`
	Email    string    `json:"email"`
	Phone    string    `json:"phone"`
	Role     string    `json:"role"`
	TenantID uuid.UUID `json:"tenant_id"`
}

type TenantInfo struct {
	ID       uuid.UUID `json:"id"`
	Name     string    `json:"name"`
	Email    string    `json:"email"`
	IsActive bool      `json:"is_active"`
}

type Claims struct {
	UserID   string `json:"user_id"`
	TenantID string `json:"tenant_id"`
	Role     string `json:"role"`
	Email    string `json:"email"`
	jwt.RegisteredClaims
}

func NewAuthService(queries db.Querier, jwtSecret string) *AuthService {
	return &AuthService{
		queries:   queries,
		jwtSecret: jwtSecret,
	}
}

func (s *AuthService) Register(ctx context.Context, req RegisterRequest) (*LoginResponse, error) {
	// Check if user already exists
	_, err := s.queries.GetUserByEmail(ctx, db.GetUserByEmailParams{
		Email:    req.Email,
		TenantID: uuid.Nil, // We'll set this after tenant creation
	})
	if err == nil {
		return nil, errors.New("user already exists")
	}

	// Create tenant first
	tenant, err := s.queries.CreateTenant(ctx, db.CreateTenantParams{
		Name:     req.Company,
		Email:    req.Email,
		Phone:    req.Phone,
		IsActive: true,
	})
	if err != nil {
		return nil, err
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	// Create admin user
	user, err := s.queries.CreateUser(ctx, db.CreateUserParams{
		Name:          req.Name,
		Email:         req.Email,
		Password:      string(hashedPassword),
		Phone:         req.Phone,
		TenantID:      tenant.ID,
		Role:          "admin", // First user is always admin
		EmailVerified: utils.P.Bool(true),
		IsActive:      utils.P.Bool(true),
	})
	if err != nil {
		return nil, err
	}

	// Generate tokens
	token, refreshToken, expiresAt, err := s.generateTokens(user, tenant)
	if err != nil {
		return nil, err
	}

	return &LoginResponse{
		Token:        token,
		RefreshToken: refreshToken,
		ExpiresAt:    expiresAt,
		User: UserInfo{
			ID:       user.ID,
			Name:     user.Name,
			Email:    user.Email,
			Phone:    user.Phone,
			Role:     user.Role.(string),
			TenantID: user.TenantID,
		},
		Tenant: TenantInfo{
			ID:       tenant.ID,
			Name:     tenant.Name,
			Email:    tenant.Email,
			IsActive: tenant.IsActive,
		},
	}, nil
}

func (s *AuthService) Login(ctx context.Context, req LoginRequest) (*LoginResponse, error) {
	// Get user by email (we need to find the tenant first)
	// This is a simplified approach - in production you might want a different strategy
	users, err := s.queries.ListUsersByRole(ctx, db.ListUsersByRoleParams{
		Role:   "admin", // Start with admin to find tenant
		Limit:  100,
		Offset: 0,
	})
	if err != nil {
		return nil, err
	}

	var user db.User
	var found bool
	for _, u := range users {
		if u.Email == req.Email {
			user = u
			found = true
			break
		}
	}

	if !found {
		return nil, errors.New("invalid credentials")
	}

	// Verify password
	err = bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password))
	if err != nil {
		return nil, errors.New("invalid credentials")
	}

	// Check if user is active
	if !utils.P.FromBool(user.IsActive) {
		return nil, errors.New("account is disabled")
	}

	// Get tenant
	tenant, err := s.queries.GetTenantByID(ctx, user.TenantID)
	if err != nil {
		return nil, err
	}

	if !tenant.IsActive {
		return nil, errors.New("tenant account is disabled")
	}

	// Generate tokens
	token, refreshToken, expiresAt, err := s.generateTokens(user, tenant)
	if err != nil {
		return nil, err
	}

	return &LoginResponse{
		Token:        token,
		RefreshToken: refreshToken,
		ExpiresAt:    expiresAt,
		User: UserInfo{
			ID:       user.ID,
			Name:     user.Name,
			Email:    user.Email,
			Phone:    user.Phone,
			Role:     user.Role.(string),
			TenantID: user.TenantID,
		},
		Tenant: TenantInfo{
			ID:       tenant.ID,
			Name:     tenant.Name,
			Email:    tenant.Email,
			IsActive: tenant.IsActive,
		},
	}, nil
}

func (s *AuthService) generateTokens(user db.User, tenant db.Tenant) (string, string, time.Time, error) {
	expiresAt := time.Now().Add(24 * time.Hour)
	
	claims := Claims{
		UserID:   user.ID.String(),
		TenantID: tenant.ID.String(),
		Role:     user.Role.(string),
		Email:    user.Email,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expiresAt),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "agromart",
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte(s.jwtSecret))
	if err != nil {
		return "", "", time.Time{}, err
	}

	// Generate refresh token
	refreshToken, err := s.generateRefreshToken()
	if err != nil {
		return "", "", time.Time{}, err
	}

	return tokenString, refreshToken, expiresAt, nil
}

func (s *AuthService) generateRefreshToken() (string, error) {
	bytes := make([]byte, 32)
	_, err := rand.Read(bytes)
	if err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}

func (s *AuthService) ValidateToken(tokenString string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		return []byte(s.jwtSecret), nil
	})
	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*Claims); ok && token.Valid {
		return claims, nil
	}

	return nil, errors.New("invalid token")
}
