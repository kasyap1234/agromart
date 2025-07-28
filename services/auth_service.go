package services

import (
	"context"
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/kasyap1234/agromart/models"
	"github.com/kasyap1234/agromart/repositories"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type AuthService struct {
	userRepo   *repositories.UserRepository
	jwtSecret  []byte
	tokenExpiry time.Duration
}

type JWTClaims struct {
	UserID   uuid.UUID `json:"user_id"`
	TenantID uuid.UUID `json:"tenant_id"`
	Role     string    `json:"role"`
	Email    string    `json:"email"`
	jwt.RegisteredClaims
}

type LoginRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required,min=6"`
	TenantID string `json:"tenant_id" validate:"required,uuid"`
}

type RegisterRequest struct {
	Name     string `json:"name" validate:"required,min=2"`
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required,min=6"`
	Phone    string `json:"phone" validate:"required"`
	TenantID string `json:"tenant_id" validate:"required,uuid"`
	Role     string `json:"role,omitempty"`
}

type AuthResponse struct {
	Token        string      `json:"token"`
	RefreshToken string      `json:"refresh_token"`
	User         *models.User `json:"user"`
	ExpiresAt    time.Time   `json:"expires_at"`
}

type ChangePasswordRequest struct {
	CurrentPassword string `json:"current_password" validate:"required"`
	NewPassword     string `json:"new_password" validate:"required,min=6"`
}

func NewAuthService(userRepo *repositories.UserRepository, jwtSecret string) *AuthService {
	return &AuthService{
		userRepo:    userRepo,
		jwtSecret:   []byte(jwtSecret),
		tokenExpiry: 24 * time.Hour, // 24 hours
	}
}

// Login authenticates a user and returns JWT tokens
func (s *AuthService) Login(ctx context.Context, req LoginRequest) (*AuthResponse, error) {
	tenantID, err := uuid.Parse(req.TenantID)
	if err != nil {
		return nil, errors.New("invalid tenant ID")
	}

	// Get user by email and tenant
	user, err := s.userRepo.GetUserByEmail(ctx, req.Email, tenantID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("invalid email or password")
		}
		return nil, err
	}

	// Check if user is active
	if user.IsActive != nil && !*user.IsActive {
		return nil, errors.New("account is deactivated")
	}

	// Verify password
	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		return nil, errors.New("invalid email or password")
	}

	// Generate tokens
	token, refreshToken, expiresAt, err := s.generateTokens(user)
	if err != nil {
		return nil, err
	}

	// Remove password from response
	user.Password = ""

	return &AuthResponse{
		Token:        token,
		RefreshToken: refreshToken,
		User:         user,
		ExpiresAt:    expiresAt,
	}, nil
}

// Register creates a new user account
func (s *AuthService) Register(ctx context.Context, req RegisterRequest) (*AuthResponse, error) {
	tenantID, err := uuid.Parse(req.TenantID)
	if err != nil {
		return nil, errors.New("invalid tenant ID")
	}

	// Check if user already exists
	existingUser, err := s.userRepo.GetUserByEmail(ctx, req.Email, tenantID)
	if err == nil && existingUser != nil {
		return nil, errors.New("user with this email already exists")
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	// Set default role if not provided
	role := req.Role
	if role == "" {
		role = "user"
	}

	// Create user
	params := repositories.CreateUserParams{
		Name:     req.Name,
		Email:    req.Email,
		Password: string(hashedPassword),
		Phone:    req.Phone,
		TenantID: tenantID,
		Role:     role,
	}

	user, err := s.userRepo.CreateUserFromParams(ctx, params)
	if err != nil {
		return nil, err
	}

	// Generate tokens
	token, refreshToken, expiresAt, err := s.generateTokens(user)
	if err != nil {
		return nil, err
	}

	// Remove password from response
	user.Password = ""

	return &AuthResponse{
		Token:        token,
		RefreshToken: refreshToken,
		User:         user,
		ExpiresAt:    expiresAt,
	}, nil
}

// ChangePassword changes user's password
func (s *AuthService) ChangePassword(ctx context.Context, userID, tenantID uuid.UUID, req ChangePasswordRequest) error {
	// Get user
	user, err := s.userRepo.GetUserByID(ctx, userID)
	if err != nil {
		return err
	}

	// Verify current password
	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.CurrentPassword)); err != nil {
		return errors.New("current password is incorrect")
	}

	// Hash new password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	// Update password
	params := repositories.UpdateUserPasswordParams{
		Password: string(hashedPassword),
		ID:       userID,
		TenantID: tenantID,
	}

	return s.userRepo.UpdateUserPasswordFromParams(ctx, params)
}

// RefreshToken generates new tokens using refresh token
func (s *AuthService) RefreshToken(ctx context.Context, refreshToken string) (*AuthResponse, error) {
	// Parse and validate refresh token
	token, err := jwt.ParseWithClaims(refreshToken, &JWTClaims{}, func(token *jwt.Token) (interface{}, error) {
		return s.jwtSecret, nil
	})

	if err != nil {
		return nil, errors.New("invalid refresh token")
	}

	claims, ok := token.Claims.(*JWTClaims)
	if !ok || !token.Valid {
		return nil, errors.New("invalid refresh token")
	}

	// Get user
	user, err := s.userRepo.GetUserByID(ctx, claims.UserID)
	if err != nil {
		return nil, err
	}

	// Check if user is still active
	if user.IsActive != nil && !*user.IsActive {
		return nil, errors.New("account is deactivated")
	}

	// Generate new tokens
	newToken, newRefreshToken, expiresAt, err := s.generateTokens(user)
	if err != nil {
		return nil, err
	}

	// Remove password from response
	user.Password = ""

	return &AuthResponse{
		Token:        newToken,
		RefreshToken: newRefreshToken,
		User:         user,
		ExpiresAt:    expiresAt,
	}, nil
}

// ValidateToken validates JWT token and returns claims
func (s *AuthService) ValidateToken(tokenString string) (*JWTClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &JWTClaims{}, func(token *jwt.Token) (interface{}, error) {
		return s.jwtSecret, nil
	})

	if err != nil {
		return nil, err
	}

	claims, ok := token.Claims.(*JWTClaims)
	if !ok || !token.Valid {
		return nil, errors.New("invalid token")
	}

	return claims, nil
}

// generateTokens creates access and refresh tokens
func (s *AuthService) generateTokens(user *models.User) (string, string, time.Time, error) {
	now := time.Now()
	expiresAt := now.Add(s.tokenExpiry)

	// Create access token claims
	claims := &JWTClaims{
		UserID:   user.ID,
		TenantID: user.TenantID,
		Role:     user.Role,
		Email:    user.Email,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expiresAt),
			IssuedAt:  jwt.NewNumericDate(now),
			NotBefore: jwt.NewNumericDate(now),
			Issuer:    "agromart",
			Subject:   user.ID.String(),
		},
	}

	// Create access token
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	accessToken, err := token.SignedString(s.jwtSecret)
	if err != nil {
		return "", "", time.Time{}, err
	}

	// Create refresh token (expires in 7 days)
	refreshClaims := &JWTClaims{
		UserID:   user.ID,
		TenantID: user.TenantID,
		Role:     user.Role,
		Email:    user.Email,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(now.Add(7 * 24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(now),
			NotBefore: jwt.NewNumericDate(now),
			Issuer:    "agromart",
			Subject:   user.ID.String(),
		},
	}

	refreshToken := jwt.NewWithClaims(jwt.SigningMethodHS256, refreshClaims)
	refreshTokenString, err := refreshToken.SignedString(s.jwtSecret)
	if err != nil {
		return "", "", time.Time{}, err
	}

	return accessToken, refreshTokenString, expiresAt, nil
}
