package repositories

import (
	"context"

	"github.com/google/uuid"
	"github.com/kasyap1234/agromart/models"
	"github.com/shopspring/decimal"
	"gorm.io/gorm"
)

type ProductRepository struct {
	db *gorm.DB
}

func NewProductRepository(db *gorm.DB) *ProductRepository {
	return &ProductRepository{db: db}
}

func (r *ProductRepository) CheckProductExists(ctx context.Context, productID, tenantID uuid.UUID) (bool, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&models.Product{}).
		Where("id = ? AND tenant_id = ?", productID, tenantID).
		Count(&count).Error
	return count > 0, err
}

func (r *ProductRepository) CountProducts(ctx context.Context, tenantID uuid.UUID) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&models.Product{}).
		Where("tenant_id = ?", tenantID).
		Count(&count).Error
	return count, err
}

func (r *ProductRepository) CreateProduct(ctx context.Context, product *models.Product) error {
	return r.db.WithContext(ctx).Create(product).Error
}

func (r *ProductRepository) GetProductByID(ctx context.Context, productID, tenantID uuid.UUID) (*models.Product, error) {
	var product models.Product
	err := r.db.WithContext(ctx).
		Where("id = ? AND tenant_id = ?", productID, tenantID).
		First(&product).Error
	if err != nil {
		return nil, err
	}
	return &product, nil
}

func (r *ProductRepository) GetProductBySKU(ctx context.Context, sku string, tenantID uuid.UUID) (*models.Product, error) {
	var product models.Product
	err := r.db.WithContext(ctx).
		Where("sku = ? AND tenant_id = ?", sku, tenantID).
		First(&product).Error
	if err != nil {
		return nil, err
	}
	return &product, nil
}

func (r *ProductRepository) ListProducts(ctx context.Context, tenantID uuid.UUID, limit, offset int) ([]models.Product, error) {
	var products []models.Product
	err := r.db.WithContext(ctx).
		Where("tenant_id = ?", tenantID).
		Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&products).Error
	return products, err
}

func (r *ProductRepository) SearchProducts(ctx context.Context, tenantID uuid.UUID, query string, limit, offset int) ([]models.Product, error) {
	var products []models.Product
	searchQuery := "%" + query + "%"
	err := r.db.WithContext(ctx).
		Where("tenant_id = ? AND (name ILIKE ? OR sku ILIKE ?)", tenantID, searchQuery, searchQuery).
		Order("name").
		Limit(limit).
		Offset(offset).
		Find(&products).Error
	return products, err
}

func (r *ProductRepository) UpdateProduct(ctx context.Context, productID, tenantID uuid.UUID, updates map[string]interface{}) error {
	return r.db.WithContext(ctx).Model(&models.Product{}).
		Where("id = ? AND tenant_id = ?", productID, tenantID).
		Updates(updates).Error
}

func (r *ProductRepository) UpdateProductDetails(ctx context.Context, productID, tenantID uuid.UUID, product *models.Product) error {
	return r.db.WithContext(ctx).Model(&models.Product{}).
		Where("id = ? AND tenant_id = ?", productID, tenantID).
		Updates(map[string]interface{}{
			"name":           product.Name,
			"price":          product.Price,
			"description":    product.Description,
			"image_url":      product.ImageURL,
			"brand":          product.Brand,
			"unit_id":        product.UnitID,
			"price_per_unit": product.PricePerUnit,
			"gst_percent":    product.GSTPercent,
		}).Error
}

// Unit related methods
func (r *ProductRepository) CreateUnit(ctx context.Context, unit *models.Unit) error {
	return r.db.WithContext(ctx).Create(unit).Error
}

func (r *ProductRepository) GetUnitByID(ctx context.Context, unitID, tenantID uuid.UUID) (*models.Unit, error) {
	var unit models.Unit
	err := r.db.WithContext(ctx).
		Where("id = ? AND tenant_id = ?", unitID, tenantID).
		First(&unit).Error
	if err != nil {
		return nil, err
	}
	return &unit, nil
}

func (r *ProductRepository) ListUnits(ctx context.Context, tenantID uuid.UUID, limit, offset int) ([]models.Unit, error) {
	var units []models.Unit
	err := r.db.WithContext(ctx).
		Where("tenant_id = ?", tenantID).
		Order("name").
		Limit(limit).
		Offset(offset).
		Find(&units).Error
	return units, err
}

func (r *ProductRepository) UpdateUnit(ctx context.Context, unitID, tenantID uuid.UUID, unit *models.Unit) error {
	return r.db.WithContext(ctx).Model(&models.Unit{}).
		Where("id = ? AND tenant_id = ?", unitID, tenantID).
		Updates(map[string]interface{}{
			"name":         unit.Name,
			"abbreviation": unit.Abbreviation,
		}).Error
}

// Helper types for service layer compatibility
type CreateProductParams struct {
	TenantID     uuid.UUID
	SKU          string
	Name         string
	Price        decimal.Decimal
	Description  *string
	ImageURL     *string
	Brand        *string
	UnitID       uuid.UUID
	PricePerUnit *decimal.Decimal
	GSTPercent   *decimal.Decimal
}

type CreateUnitParams struct {
	TenantID     uuid.UUID
	Name         string
	Abbreviation string
}

func (r *ProductRepository) CreateProductFromParams(ctx context.Context, params CreateProductParams) (*models.Product, error) {
	product := &models.Product{
		TenantID:     params.TenantID,
		SKU:          params.SKU,
		Name:         params.Name,
		Price:        params.Price,
		Description:  params.Description,
		ImageURL:     params.ImageURL,
		Brand:        params.Brand,
		UnitID:       params.UnitID,
		PricePerUnit: params.PricePerUnit,
		GSTPercent:   params.GSTPercent,
	}
	
	err := r.CreateProduct(ctx, product)
	if err != nil {
		return nil, err
	}
	return product, nil
}

func (r *ProductRepository) CreateUnitFromParams(ctx context.Context, params CreateUnitParams) (*models.Unit, error) {
	unit := &models.Unit{
		TenantID:     params.TenantID,
		Name:         params.Name,
		Abbreviation: params.Abbreviation,
	}
	
	err := r.CreateUnit(ctx, unit)
	if err != nil {
		return nil, err
	}
	return unit, nil
}
