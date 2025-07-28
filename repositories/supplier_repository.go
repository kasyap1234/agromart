package repositories

import (
	"context"

	"github.com/google/uuid"
	"github.com/kasyap1234/agromart/models"
	"gorm.io/gorm"
)

type SupplierRepository struct {
	db *gorm.DB
}

func NewSupplierRepository(db *gorm.DB) *SupplierRepository {
	return &SupplierRepository{db: db}
}

func (r *SupplierRepository) CreateSupplier(ctx context.Context, supplier *models.Supplier) error {
	return r.db.WithContext(ctx).Create(supplier).Error
}

func (r *SupplierRepository) GetSupplierByID(ctx context.Context, supplierID, tenantID uuid.UUID) (*models.Supplier, error) {
	var supplier models.Supplier
	err := r.db.WithContext(ctx).
		Where("id = ? AND tenant_id = ?", supplierID, tenantID).
		First(&supplier).Error
	if err != nil {
		return nil, err
	}
	return &supplier, nil
}

func (r *SupplierRepository) ListSuppliers(ctx context.Context, tenantID uuid.UUID, isActive *bool, limit, offset int) ([]models.Supplier, error) {
	var suppliers []models.Supplier
	query := r.db.WithContext(ctx).Where("tenant_id = ?", tenantID)
	
	if isActive != nil {
		query = query.Where("is_active = ?", *isActive)
	}
	
	err := query.Order("name").
		Limit(limit).
		Offset(offset).
		Find(&suppliers).Error
	return suppliers, err
}

func (r *SupplierRepository) UpdateSupplier(ctx context.Context, supplierID, tenantID uuid.UUID, supplier *models.Supplier) error {
	return r.db.WithContext(ctx).Model(&models.Supplier{}).
		Where("id = ? AND tenant_id = ?", supplierID, tenantID).
		Updates(map[string]interface{}{
			"name":           supplier.Name,
			"contact_person": supplier.ContactPerson,
			"email":          supplier.Email,
			"phone":          supplier.Phone,
			"address":        supplier.Address,
			"tax_id":         supplier.TaxID,
			"payment_mode":   supplier.PaymentMode,
			"is_active":      supplier.IsActive,
		}).Error
}

// Helper types for service layer compatibility
type CreateSupplierParams struct {
	TenantID      uuid.UUID
	Name          string
	ContactPerson *string
	Email         *string
	Phone         *string
	Address       *string
	TaxID         *string
	PaymentMode   *string
	IsActive      *bool
}

type UpdateSupplierParams struct {
	ID            uuid.UUID
	Name          string
	ContactPerson *string
	Email         *string
	Phone         *string
	Address       *string
	TaxID         *string
	PaymentMode   *string
	IsActive      *bool
	TenantID      uuid.UUID
}

func (r *SupplierRepository) CreateSupplierFromParams(ctx context.Context, params CreateSupplierParams) (*models.Supplier, error) {
	supplier := &models.Supplier{
		TenantID:      params.TenantID,
		Name:          params.Name,
		ContactPerson: params.ContactPerson,
		Email:         params.Email,
		Phone:         params.Phone,
		Address:       params.Address,
		TaxID:         params.TaxID,
		PaymentMode:   params.PaymentMode,
		IsActive:      params.IsActive,
	}
	
	err := r.CreateSupplier(ctx, supplier)
	if err != nil {
		return nil, err
	}
	return supplier, nil
}

func (r *SupplierRepository) UpdateSupplierFromParams(ctx context.Context, params UpdateSupplierParams) (*models.Supplier, error) {
	supplier := &models.Supplier{
		Name:          params.Name,
		ContactPerson: params.ContactPerson,
		Email:         params.Email,
		Phone:         params.Phone,
		Address:       params.Address,
		TaxID:         params.TaxID,
		PaymentMode:   params.PaymentMode,
		IsActive:      params.IsActive,
	}
	
	err := r.UpdateSupplier(ctx, params.ID, params.TenantID, supplier)
	if err != nil {
		return nil, err
	}
	
	// Fetch and return the updated supplier
	return r.GetSupplierByID(ctx, params.ID, params.TenantID)
}
