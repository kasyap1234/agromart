package repositories

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/kasyap1234/agromart/models"
	"gorm.io/gorm"
)

type CustomerRepository struct {
	db *gorm.DB
}

func NewCustomerRepository(db *gorm.DB) *CustomerRepository {
	return &CustomerRepository{db: db}
}

func (r *CustomerRepository) CreateCustomer(ctx context.Context, customer *models.Customer) error {
	return r.db.WithContext(ctx).Create(customer).Error
}

func (r *CustomerRepository) GetCustomerByID(ctx context.Context, customerID, tenantID uuid.UUID) (*models.Customer, error) {
	var customer models.Customer
	err := r.db.WithContext(ctx).
		Where("id = ? AND tenant_id = ?", customerID, tenantID).
		First(&customer).Error
	if err != nil {
		return nil, err
	}
	return &customer, nil
}

func (r *CustomerRepository) ListCustomers(ctx context.Context, tenantID uuid.UUID, isActive *bool, limit, offset int) ([]models.Customer, error) {
	var customers []models.Customer
	query := r.db.WithContext(ctx).Where("tenant_id = ?", tenantID)
	
	if isActive != nil {
		query = query.Where("is_active = ?", *isActive)
	}
	
	err := query.Order("name").
		Limit(limit).
		Offset(offset).
		Find(&customers).Error
	return customers, err
}

func (r *CustomerRepository) UpdateCustomer(ctx context.Context, customerID, tenantID uuid.UUID, customer *models.Customer) error {
	return r.db.WithContext(ctx).Model(&models.Customer{}).
		Where("id = ? AND tenant_id = ?", customerID, tenantID).
		Updates(map[string]interface{}{
			"name":           customer.Name,
			"contact_person": customer.ContactPerson,
			"email":          customer.Email,
			"phone":          customer.Phone,
			"address":        customer.Address,
			"payment_mode":   customer.PaymentMode,
			"is_active":      customer.IsActive,
			"updated_at":     time.Now(),
		}).Error
}

// Helper types for service layer compatibility
type CreateCustomerParams struct {
	TenantID      uuid.UUID
	Name          string
	ContactPerson *string
	Email         *string
	Phone         *string
	Address       *string
	PaymentMode   *string
	IsActive      *bool
}

type UpdateCustomerParams struct {
	ID            uuid.UUID
	Name          string
	ContactPerson *string
	Email         *string
	Phone         *string
	Address       *string
	PaymentMode   *string
	IsActive      *bool
	TenantID      uuid.UUID
}

func (r *CustomerRepository) CreateCustomerFromParams(ctx context.Context, params CreateCustomerParams) (*models.Customer, error) {
	customer := &models.Customer{
		TenantID:      params.TenantID,
		Name:          params.Name,
		ContactPerson: params.ContactPerson,
		Email:         params.Email,
		Phone:         params.Phone,
		Address:       params.Address,
		PaymentMode:   params.PaymentMode,
		IsActive:      params.IsActive,
	}
	
	err := r.CreateCustomer(ctx, customer)
	if err != nil {
		return nil, err
	}
	return customer, nil
}

func (r *CustomerRepository) UpdateCustomerFromParams(ctx context.Context, params UpdateCustomerParams) (*models.Customer, error) {
	customer := &models.Customer{
		Name:          params.Name,
		ContactPerson: params.ContactPerson,
		Email:         params.Email,
		Phone:         params.Phone,
		Address:       params.Address,
		PaymentMode:   params.PaymentMode,
		IsActive:      params.IsActive,
	}
	
	err := r.UpdateCustomer(ctx, params.ID, params.TenantID, customer)
	if err != nil {
		return nil, err
	}
	
	return r.GetCustomerByID(ctx, params.ID, params.TenantID)
}
