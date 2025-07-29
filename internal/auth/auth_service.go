package auth

import (
	"context"
	"errors"
	"fmt"

	"agromart2/db"
	"agromart2/internal/utils"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
)

type AuthService struct {
	db      *pgxpool.Pool
	queries *db.Queries
	jwt     *JWTService
}

type LoginRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required,min=6"`
}

type RegisterRequest struct {
	Name        string `json:"name" validate:"required"`
	Email       string `json:"email" validate:"required,email"`
	Password    string `json:"password" validate:"required,min=6"`
	Phone       string `json:"phone" validate:"required"`
	CompanyName string `json:"company_name" validate:"required"`
	Role        string `json:"role,omitempty"`
}

type AuthResponse struct {
	User         *db.User `json:"user"`
	Token        string   `json:"token"`
	RefreshToken string   `json:"refresh_token"`
}

type UserWithTenant struct {
	User   db.User   `json:"user"`
	Tenant db.Tenant `json:"tenant"`
}

func NewAuthService(dbPool *pgxpool.Pool, queries *db.Queries, jwtService *JWTService) *AuthService {
	return &AuthService{
		db:      dbPool,
		queries: queries,
		jwt:     jwtService,
	}
}

// Register creates a new user and tenant
func (s *AuthService) Register(ctx context.Context, req RegisterRequest) (*AuthResponse, error) {
	// Start transaction
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to start transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	qtx := s.queries.WithTx(tx)

	// Create tenant first
	tenant, err := qtx.CreateTenant(ctx, db.CreateTenantParams{
		Name:               req.CompanyName,
		Email:              req.Email,
		Phone:              req.Phone,
		Address:            utils.P.Text(""),
		RegistrationNumber: utils.P.Text(""),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create tenant: %w", err)
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("failed to hash password: %w", err)
	}

	// Set default role if not provided
	role := req.Role
	if role == "" {
		role = "admin" // First user in tenant is admin
	}

	// Create user
	user, err := qtx.CreateUser(ctx, db.CreateUserParams{
		Name:     req.Name,
		Email:    req.Email,
		Password: string(hashedPassword),
		Phone:    req.Phone,
		TenantID: tenant.ID,
		Role:     role,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	// Commit transaction
	if err = tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	// Generate tokens
	token, err := s.jwt.GenerateToken(user.ID.String(), user.TenantID.String(), user.Email, role)
	if err != nil {
		return nil, fmt.Errorf("failed to generate token: %w", err)
	}

	refreshToken, err := s.jwt.GenerateRefreshToken(user.ID.String())
	if err != nil {
		return nil, fmt.Errorf("failed to generate refresh token: %w", err)
	}

	return &AuthResponse{
		User:         &user,
		Token:        token,
		RefreshToken: refreshToken,
	}, nil
}

// Login authenticates a user
func (s *AuthService) Login(ctx context.Context, req LoginRequest) (*AuthResponse, error) {
	// First, we need to find the user by email across all tenants
	// This is a simplified approach - in production, you might want tenant-specific login
	user, err := s.getUserByEmailAcrossTenants(ctx, req.Email)
	if err != nil {
		return nil, errors.New("invalid credentials")
	}

	// Verify password
	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		return nil, errors.New("invalid credentials")
	}

	// Check if user is active
	if user.IsActive.Valid && !user.IsActive.Bool {
		return nil, errors.New("account is deactivated")
	}

	// Generate tokens
	token, err := s.jwt.GenerateToken(user.ID.String(), user.TenantID.String(), user.Email, user.Role.(string))
	if err != nil {
		return nil, fmt.Errorf("failed to generate token: %w", err)
	}

	refreshToken, err := s.jwt.GenerateRefreshToken(user.ID.String())
	if err != nil {
		return nil, fmt.Errorf("failed to generate refresh token: %w", err)
	}

	return &AuthResponse{
		User:         user,
		Token:        token,
		RefreshToken: refreshToken,
	}, nil
}

// GetUserByID retrieves a user by ID
func (s *AuthService) GetUserByID(ctx context.Context, userID uuid.UUID) (*db.User, error) {
	user, err := s.queries.GetUserByID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("user not found: %w", err)
	}
	return &user, nil
}

// GetUserWithTenant retrieves user with tenant information
func (s *AuthService) GetUserWithTenant(ctx context.Context, userID uuid.UUID) (*UserWithTenant, error) {
	user, err := s.queries.GetUserByID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("user not found: %w", err)
	}

	tenant, err := s.queries.GetTenantByID(ctx, user.TenantID)
	if err != nil {
		return nil, fmt.Errorf("tenant not found: %w", err)
	}

	return &UserWithTenant{
		User:   user,
		Tenant: tenant,
	}, nil
}

// ValidateToken validates a JWT token
func (s *AuthService) ValidateToken(tokenStr string) (*Claims, error) {
	return s.jwt.ValidateToken(tokenStr)
}

// RefreshToken generates a new access token from refresh token
func (s *AuthService) RefreshToken(ctx context.Context, refreshToken string) (*AuthResponse, error) {
	claims, err := s.jwt.ValidateRefreshToken(refreshToken)
	if err != nil {
		return nil, fmt.Errorf("invalid refresh token: %w", err)
	}

	userID, err := uuid.Parse(claims.UserID)
	if err != nil {
		return nil, fmt.Errorf("invalid user ID in token: %w", err)
	}

	user, err := s.GetUserByID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("user not found: %w", err)
	}

	// Generate new tokens
	token, err := s.jwt.GenerateToken(user.ID.String(), user.TenantID.String(), user.Email, user.Role.(string))
	if err != nil {
		return nil, fmt.Errorf("failed to generate token: %w", err)
	}

	newRefreshToken, err := s.jwt.GenerateRefreshToken(user.ID.String())
	if err != nil {
		return nil, fmt.Errorf("failed to generate refresh token: %w", err)
	}

	return &AuthResponse{
		User:         user,
		Token:        token,
		RefreshToken: newRefreshToken,
	}, nil
}

// UpdatePassword updates user password
func (s *AuthService) UpdatePassword(ctx context.Context, userID, tenantID uuid.UUID, newPassword string) error {
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("failed to hash password: %w", err)
	}

	err = s.queries.UpdateUserPassword(ctx, db.UpdateUserPasswordParams{
		Password: string(hashedPassword),
		ID:       userID,
		TenantID: tenantID,
	})
	if err != nil {
		return fmt.Errorf("failed to update password: %w", err)
	}

	return nil
}

// ListUsers lists users for a tenant
func (s *AuthService) ListUsers(ctx context.Context, tenantID uuid.UUID, role string, limit, offset int32) ([]db.User, error) {
	users, err := s.queries.ListUsersByRole(ctx, db.ListUsersByRoleParams{
		TenantID: tenantID,
		Role:     role,
		Limit:    limit,
		Offset:   offset,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to list users: %w", err)
	}
	return users, nil
}

// UpdateUser updates user information
func (s *AuthService) UpdateUser(ctx context.Context, userID, tenantID uuid.UUID, name, email, phone, role string, emailVerified bool) (*db.User, error) {
	user, err := s.queries.UpdateUser(ctx, db.UpdateUserParams{
		ID:            userID,
		Name:          name,
		Email:         email,
		Phone:         phone,
		Role:          role,
		EmailVerified: utils.P.Bool(emailVerified),
		TenantID:      tenantID,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to update user: %w", err)
	}
	return &user, nil
}

// Helper function to find user by email across tenants
func (s *AuthService) getUserByEmailAcrossTenants(ctx context.Context, email string) (*db.User, error) {
	// This is a simplified approach. In production, you might want to:
	// 1. Have a separate query that doesn't require tenant_id
	// 2. Or implement tenant-specific login domains
	
	// For now, we'll query the database directly
	query := `SELECT id, name, email, password, phone, tenant_id, role, email_verified, is_active, created_at 
			  FROM users WHERE email = $1 AND (is_active IS NULL OR is_active = true) LIMIT 1`
	
	var user db.User
	err := s.db.QueryRow(ctx, query, email).Scan(
		&user.ID,
		&user.Name,
		&user.Email,
		&user.Password,
		&user.Phone,
		&user.TenantID,
		&user.Role,
		&user.EmailVerified,
		&user.IsActive,
		&user.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	
	return &user, nil
}
