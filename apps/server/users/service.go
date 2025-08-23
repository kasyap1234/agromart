package users

import (
	"context"
	"database/sql"
	"fmt"

	"agromart2/db"
	"agromart2/internal/validation"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rs/zerolog/log"
	"golang.org/x/crypto/bcrypt"
)

type UserService struct {
	db *pgxpool.Pool
	q  *db.Queries
}

func NewUserService(db *pgxpool.Pool, queries *db.Queries) *UserService {
	return &UserService{
		db: db,
		q:  queries,
	}
}

type CreateUserParams struct {
	TenantID uuid.UUID
	Name     string
	Email    string
	Password string
	Phone    string
	Role     string
}

type UpdateUserParams struct {
	ID            uuid.UUID
	TenantID      uuid.UUID
	Name          string
	Email         string
	Phone         string
	Role          string
	EmailVerified bool
	IsActive      bool
}

// CreateUser creates a new user
func (s *UserService) CreateUser(ctx context.Context, params CreateUserParams) (db.User, error) {
	// Validate password strength
	if err := validation.ValidatePassword(params.Password); err != nil {
		return db.User{}, fmt.Errorf("password validation failed: %w", err)
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(params.Password), bcrypt.DefaultCost)
	if err != nil {
		return db.User{}, fmt.Errorf("failed to hash password: %w", err)
	}

	args := db.CreateUserParams{
		Name:     params.Name,
		Email:    params.Email,
		Password: string(hashedPassword),
		Phone:    params.Phone,
		TenantID: params.TenantID,
		Column6:  params.Role,
	}

	row, err := s.q.CreateUser(ctx, args)
	if err != nil {
		log.Error().Err(err).Msg("failed to create user")
		return db.User{}, fmt.Errorf("failed to create user: %w", err)
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

	return user, nil
}

// GetUserByID retrieves a user by ID
func (s *UserService) GetUserByID(ctx context.Context, id, tenantID uuid.UUID) (db.User, error) {
	row, err := s.q.GetUserByID(ctx, id)
	if err != nil {
		log.Error().Err(err).Msg("failed to get user by ID")
		return db.User{}, fmt.Errorf("user not found: %w", err)
	}

	// Check if user belongs to the same tenant
	if row.TenantID != tenantID {
		return db.User{}, fmt.Errorf("user not found")
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

	return user, nil
}

// ListUsers lists all users for a tenant
func (s *UserService) ListUsers(ctx context.Context, tenantID uuid.UUID, limit, offset int32) ([]db.User, error) {
	args := db.ListUsersParams{
		TenantID: tenantID,
		Limit:    limit,
		Offset:   offset,
	}

	rows, err := s.q.ListUsers(ctx, args)
	if err != nil {
		log.Error().Err(err).Msg("failed to list users")
		return []db.User{}, fmt.Errorf("failed to list users: %w", err)
	}

	users := make([]db.User, 0, len(rows))
	for _, row := range rows {
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
		users = append(users, user)
	}

	return users, nil
}

// UpdateUser updates a user
func (s *UserService) UpdateUser(ctx context.Context, params UpdateUserParams) (db.User, error) {
	args := db.UpdateUserParams{
		ID:            params.ID,
		Name:          params.Name,
		Email:         params.Email,
		Phone:         params.Phone,
		Column5:       params.Role,
		EmailVerified: sql.NullBool{Bool: params.EmailVerified, Valid: true},
		TenantID:      params.TenantID,
	}

	row, err := s.q.UpdateUser(ctx, args)
	if err != nil {
		log.Error().Err(err).Msg("failed to update user")
		return db.User{}, fmt.Errorf("failed to update user: %w", err)
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

	return user, nil
}

// DeleteUser soft deletes a user (sets is_active to false)
func (s *UserService) DeleteUser(ctx context.Context, id, tenantID uuid.UUID) error {
	args := db.DeactivateUserParams{
		ID:       id,
		TenantID: tenantID,
	}

	err := s.q.DeactivateUser(ctx, args)
	if err != nil {
		log.Error().Err(err).Msg("failed to deactivate user")
		return fmt.Errorf("failed to deactivate user: %w", err)
	}

	return nil
}

// SearchUsers searches users by name or email
func (s *UserService) SearchUsers(ctx context.Context, tenantID uuid.UUID, searchTerm string, limit, offset int32) ([]db.User, error) {
	args := db.SearchUsersParams{
		TenantID: tenantID,
		Name:     "%" + searchTerm + "%",
		Limit:    limit,
		Offset:   offset,
	}

	rows, err := s.q.SearchUsers(ctx, args)
	if err != nil {
		log.Error().Err(err).Msg("failed to search users")
		return []db.User{}, fmt.Errorf("failed to search users: %w", err)
	}

	users := make([]db.User, 0, len(rows))
	for _, row := range rows {
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
		users = append(users, user)
	}

	return users, nil
}

// CountUsers counts total users for a tenant
func (s *UserService) CountUsers(ctx context.Context, tenantID uuid.UUID) (int64, error) {
	count, err := s.q.CountUsers(ctx, tenantID)
	if err != nil {
		log.Error().Err(err).Msg("failed to count users")
		return 0, fmt.Errorf("failed to count users: %w", err)
	}

	return count, nil
}

// CheckUserExists checks if a user exists
func (s *UserService) CheckUserExists(ctx context.Context, id, tenantID uuid.UUID) (bool, error) {
	args := db.CheckUserExistsParams{
		ID:       id,
		TenantID: tenantID,
	}

	exists, err := s.q.CheckUserExists(ctx, args)
	if err != nil {
		log.Error().Err(err).Msg("failed to check user existence")
		return false, fmt.Errorf("failed to check user existence: %w", err)
	}

	return exists, nil
}
