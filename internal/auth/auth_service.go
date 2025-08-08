package auth

import (
	"context"
	"errors"
	"fmt"
	"time"
	"os"
	"unicode/utf8"
	"strings"

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

// devDebugf prints development-only diagnostic information.
// Never log secrets; only metadata like lengths/flags/ids.
func devDebugf(format string, args ...any) {
	env := os.Getenv("APP_ENV")
	if env == "" || env == "development" || env == "local" {
		fmt.Printf("[DEV] "+format+"\n", args...)
	}
}

func containsNonASCII(s string) bool {
	for _, r := range s {
		if r > 127 {
			return true
		}
	}
	return false
}

// local helpers to normalize email without importing strings globally
func trimASCII(s string) string {
	b := []rune(s)
	i, j := 0, len(b)-1
	for i <= j && (b[i] == ' ' || b[i] == '\t' || b[i] == '\n' || b[i] == '\r') {
		i++
	}
	for j >= i && (b[j] == ' ' || b[j] == '\t' || b[j] == '\n' || b[j] == '\r') {
		j--
	}
	if i > j {
		return ""
	}
	return string(b[i : j+1])
}
func toLowerASCII(in string) string {
	b := []byte(in)
	for i := range b {
		if b[i] >= 'A' && b[i] <= 'Z' {
			b[i] += 32
		}
	}
	return string(b)
}

type LoginRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required,min=6"`
}

type RegisterRequest struct {
	FirstName   string `json:"first_name" validate:"required"`
	LastName    string `json:"last_name" validate:"required"`
	Email       string `json:"email" validate:"required,email"`
	Password    string `json:"password" validate:"required,min=6"`
	Phone       string `json:"phone,omitempty"`
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
	// Normalize inputs defensively to ensure consistent storage and later lookup
	req.Email = toLowerASCII(trimASCII(req.Email))
	req.Password = trimASCII(req.Password)
	req.FirstName = trimASCII(req.FirstName)
	req.LastName = trimASCII(req.LastName)
	req.Phone = trimASCII(req.Phone)
	req.CompanyName = trimASCII(req.CompanyName)

	// DEV diagnostics (metadata only)
	passLen := utf8.RuneCountInString(req.Password)
	passHasSpace := strings.Contains(req.Password, " ") || strings.ContainsRune(req.Password, '\t') || strings.ContainsRune(req.Password, '\n') || strings.ContainsRune(req.Password, '\r')
	passHasNonASCII := containsNonASCII(req.Password)
	devDebugf("auth.Register email_norm=%q email_len=%d pass_len=%d pass_has_space=%t pass_has_non_ascii=%t",
		req.Email, len(req.Email), passLen, passHasSpace, passHasNonASCII)

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
	created, err := qtx.CreateUser(ctx, db.CreateUserParams{
		Name:     fmt.Sprintf("%s %s", req.FirstName, req.LastName),
		Email:    req.Email,
		Password: string(hashedPassword),
		Phone:    req.Phone,
		TenantID: tenant.ID,
		// sqlc generated param name for $6::text is Column6
		Column6:  role,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	// Commit transaction
	if err = tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	// Map CreateUserRow to db.User for response consistency
	user := db.User{
		ID:            created.ID,
		Name:          created.Name,
		Email:         created.Email,
		Password:      created.Password,
		Phone:         created.Phone,
		TenantID:      created.TenantID,
		Role:          created.Role,
		EmailVerified: created.EmailVerified,
		IsActive:      created.IsActive,
		CreatedAt:     created.CreatedAt,
	}

	// Generate tokens
	token, err := s.jwt.GenerateToken(user.ID.String(), user.TenantID.String(), user.Email, created.Role)
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
	// Normalize email and password (trim spaces) before lookup/compare to avoid mismatch
	req.Email = toLowerASCII(trimASCII(req.Email))
	req.Password = trimASCII(req.Password)

	// DEV diagnostics (input characteristics only)
	passLen := utf8.RuneCountInString(req.Password)
	passHasSpace := strings.Contains(req.Password, " ") || strings.ContainsRune(req.Password, '\t') || strings.ContainsRune(req.Password, '\n') || strings.ContainsRune(req.Password, '\r')
	passHasNonASCII := containsNonASCII(req.Password)
	devDebugf("auth.Login email_norm=%q email_len=%d pass_len=%d pass_has_space=%t pass_has_non_ascii=%t",
		req.Email, len(req.Email), passLen, passHasSpace, passHasNonASCII)

	// First, we need to find the user by email across all tenants
	// This is a simplified approach - in production, you might want to have tenant-specific login
	user, err := s.getUserByEmailAcrossTenants(ctx, req.Email)
	if err != nil {
		devDebugf("auth.Login lookup error email=%q err=%v", req.Email, err)
		return nil, errors.New("invalid credentials")
	}
	if user == nil {
		devDebugf("auth.Login user not found email=%q", req.Email)
		return nil, errors.New("invalid credentials")
	}
	devDebugf("auth.Login selected_user_id=%s tenant_id=%s is_active_valid=%t is_active=%t role=%v",
		user.ID.String(), user.TenantID.String(), user.IsActive.Valid, user.IsActive.Bool, user.Role)

	// Verify password
	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		kind := "other"
		if errors.Is(err, bcrypt.ErrMismatchedHashAndPassword) {
			kind = "mismatch"
		}
		devDebugf("auth.Login bcrypt_compare_failed user_id=%s kind=%s hash_prefix=%q", user.ID.String(), kind, safePrefix(user.Password, 7))
		return nil, errors.New("invalid credentials")
	}

	// Check if user is active
	if user.IsActive.Valid && !user.IsActive.Bool {
		return nil, errors.New("account is deactivated")
	}

	// Generate tokens
	roleStr := ""
	switch v := user.Role.(type) {
	case string:
		roleStr = v
	default:
		// Fallback: fmt.Sprint handles pgtype.Text or other underlying types gracefully
		roleStr = fmt.Sprint(v)
	}
	token, err := s.jwt.GenerateToken(user.ID.String(), user.TenantID.String(), user.Email, roleStr)
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
	row, err := s.queries.GetUserByID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("user not found: %w", err)
	}
	user := db.User{
		ID:            row.ID,
		Name:          row.Name,
		Email:         row.Email,
		Password:      row.Password,
		Phone:         row.Phone,
		TenantID:      row.TenantID,
		Role:          row.Role,
		EmailVerified: row.EmailVerified,
		IsActive:      row.IsActive,
		CreatedAt:     row.CreatedAt,
	}
	return &user, nil
}

// GetUserWithTenant retrieves user with tenant information
func (s *AuthService) GetUserWithTenant(ctx context.Context, userID uuid.UUID) (*UserWithTenant, error) {
	row, err := s.queries.GetUserByID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("user not found: %w", err)
	}

	user := db.User{
		ID:            row.ID,
		Name:          row.Name,
		Email:         row.Email,
		Password:      row.Password,
		Phone:         row.Phone,
		TenantID:      row.TenantID,
		Role:          row.Role,
		EmailVerified: row.EmailVerified,
		IsActive:      row.IsActive,
		CreatedAt:     row.CreatedAt,
	}

	tenant, err := s.queries.GetTenantByID(ctx, row.TenantID)
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
	roleStr := ""
	switch v := user.Role.(type) {
	case string:
		roleStr = v
	default:
		roleStr = fmt.Sprint(v)
	}
	token, err := s.jwt.GenerateToken(user.ID.String(), user.TenantID.String(), user.Email, roleStr)
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

// Expose helpers for password reset flow

// safePrefix returns up to n bytes of s for diagnostics (never secrets).
func safePrefix(s string, n int) string {
if n <= 0 {
	return ""
}
if len(s) <= n {
	return s
}
return s[:n]
}

// GenerateResetToken creates a short-lived token carrying the email
func (s *AuthService) GenerateResetToken(email string, ttl time.Duration) (string, error) {
	return s.jwt.GenerateResetToken(email, ttl)
}

// ValidateResetToken validates reset token and returns claims
func (s *AuthService) ValidateResetToken(token string) (*ResetClaims, error) {
	return s.jwt.ValidateResetToken(token)
}

// GetUserByEmail is an exported helper that finds an active user by email across tenants
func (s *AuthService) GetUserByEmail(ctx context.Context, email string) (*db.User, error) {
	return s.getUserByEmailAcrossTenants(ctx, email)
}

// ListUsers lists users for a tenant
func (s *AuthService) ListUsers(ctx context.Context, tenantID uuid.UUID, role string, limit, offset int32) ([]db.User, error) {
	rows, err := s.queries.ListUsersByRole(ctx, db.ListUsersByRoleParams{
		TenantID: tenantID,
		// sqlc named this Column2 for role param
		Column2: role,
		Limit:   limit,
		Offset:  offset,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to list users: %w", err)
	}
	out := make([]db.User, 0, len(rows))
	for _, r := range rows {
		out = append(out, db.User{
			ID:            r.ID,
			Name:          r.Name,
			Email:         r.Email,
			Password:      r.Password,
			Phone:         r.Phone,
			TenantID:      r.TenantID,
			Role:          r.Role,
			EmailVerified: r.EmailVerified,
			IsActive:      r.IsActive,
			CreatedAt:     r.CreatedAt,
		})
	}
	return out, nil
}

// UpdateUser updates user information
func (s *AuthService) UpdateUser(ctx context.Context, userID, tenantID uuid.UUID, name, email, phone, role string, emailVerified bool) (*db.User, error) {
	row, err := s.queries.UpdateUser(ctx, db.UpdateUserParams{
		ID:            userID,
		Name:          name,
		Email:         email,
		Phone:         phone,
		// sqlc named this Column5 for role param
		Column5:       role,
		EmailVerified: utils.P.Bool(emailVerified),
		TenantID:      tenantID,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to update user: %w", err)
	}
	user := db.User{
		ID:            row.ID,
		Name:          row.Name,
		Email:         row.Email,
		Password:      row.Password,
		Phone:         row.Phone,
		TenantID:      row.TenantID,
		Role:          row.Role,
		EmailVerified: row.EmailVerified,
		IsActive:      row.IsActive,
		CreatedAt:     row.CreatedAt,
	}
	return &user, nil
}

// Helper function to find user by email across tenants
func (s *AuthService) getUserByEmailAcrossTenants(ctx context.Context, email string) (*db.User, error) {
	// Cast role to text to avoid pgtype unknown OID scan errors
	query := `SELECT id, name, email, password, phone, tenant_id, (role::text) AS role, email_verified, is_active, created_at
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
