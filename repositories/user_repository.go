package repositories

import (
	"context"

	"github.com/google/uuid"
	"github.com/kasyap1234/agromart/models"
	"gorm.io/gorm"
)

type UserRepository struct {
	db *gorm.DB
}

func NewUserRepository(db *gorm.DB) *UserRepository {
	return &UserRepository{db: db}
}

func (r *UserRepository) CreateUser(ctx context.Context, user *models.User) error {
	return r.db.WithContext(ctx).Create(user).Error
}

func (r *UserRepository) GetUserByID(ctx context.Context, userID uuid.UUID) (*models.User, error) {
	var user models.User
	err := r.db.WithContext(ctx).
		Where("id = ?", userID).
		First(&user).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *UserRepository) GetUserByEmail(ctx context.Context, email string, tenantID uuid.UUID) (*models.User, error) {
	var user models.User
	err := r.db.WithContext(ctx).
		Where("email = ? AND tenant_id = ?", email, tenantID).
		First(&user).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *UserRepository) ListUsersByRole(ctx context.Context, tenantID uuid.UUID, role string, limit, offset int) ([]models.User, error) {
	var users []models.User
	err := r.db.WithContext(ctx).
		Where("tenant_id = ? AND role = ?", tenantID, role).
		Order("name").
		Limit(limit).
		Offset(offset).
		Find(&users).Error
	return users, err
}

func (r *UserRepository) UpdateUser(ctx context.Context, userID, tenantID uuid.UUID, user *models.User) error {
	return r.db.WithContext(ctx).Model(&models.User{}).
		Where("id = ? AND tenant_id = ?", userID, tenantID).
		Updates(map[string]interface{}{
			"name":           user.Name,
			"email":          user.Email,
			"phone":          user.Phone,
			"role":           user.Role,
			"email_verified": user.EmailVerified,
		}).Error
}

func (r *UserRepository) UpdateUserPassword(ctx context.Context, userID, tenantID uuid.UUID, password string) error {
	return r.db.WithContext(ctx).Model(&models.User{}).
		Where("id = ? AND tenant_id = ?", userID, tenantID).
		Update("password", password).Error
}

// Helper types for service layer compatibility
type CreateUserParams struct {
	Name     string
	Email    string
	Password string
	Phone    string
	TenantID uuid.UUID
	Role     string
}

type UpdateUserParams struct {
	ID            uuid.UUID
	Name          string
	Email         string
	Phone         string
	Role          string
	EmailVerified *bool
	TenantID      uuid.UUID
}

type UpdateUserPasswordParams struct {
	Password string
	ID       uuid.UUID
	TenantID uuid.UUID
}

func (r *UserRepository) CreateUserFromParams(ctx context.Context, params CreateUserParams) (*models.User, error) {
	user := &models.User{
		Name:     params.Name,
		Email:    params.Email,
		Password: params.Password,
		Phone:    params.Phone,
		TenantID: params.TenantID,
		Role:     params.Role,
	}
	
	err := r.CreateUser(ctx, user)
	if err != nil {
		return nil, err
	}
	return user, nil
}

func (r *UserRepository) UpdateUserFromParams(ctx context.Context, params UpdateUserParams) (*models.User, error) {
	user := &models.User{
		Name:          params.Name,
		Email:         params.Email,
		Phone:         params.Phone,
		Role:          params.Role,
		EmailVerified: params.EmailVerified,
	}
	
	err := r.UpdateUser(ctx, params.ID, params.TenantID, user)
	if err != nil {
		return nil, err
	}
	
	// Fetch and return the updated user
	return r.GetUserByID(ctx, params.ID)
}

func (r *UserRepository) UpdateUserPasswordFromParams(ctx context.Context, params UpdateUserPasswordParams) error {
	return r.UpdateUserPassword(ctx, params.ID, params.TenantID, params.Password)
}
