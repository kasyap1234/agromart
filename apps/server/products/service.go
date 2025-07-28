package products

import (
	"context"

	"github.com/google/uuid"
	"github.com/kasyap1234/agromart/models"
	"github.com/kasyap1234/agromart/repositories"
	"github.com/rs/zerolog/log"
	"github.com/shopspring/decimal"
	"gorm.io/gorm"
)

type ProductService struct {
	db   *gorm.DB
	repo *repositories.ProductRepository
}

func NewProductService(db *gorm.DB, repo *repositories.ProductRepository) *ProductService {
	return &ProductService{
		db:   db,
		repo: repo,
	}
}

type ProductInputRequest struct {
	Name         *string    `json:"name,omitempty"`
	Price        *int       `json:"price,omitempty"`
	Description  *string    `json:"description,omitempty"`
	ImageUrl     *string    `json:"image_url,omitempty"`
	Brand        *string    `json:"brand,omitempty"`
	UnitID       *uuid.UUID `json:"unit_id,omitempty"`
	PricePerUnit *int       `json:"price_per_unit,omitempty"`
	GstPercent   *int       `json:"gst_percent,omitempty"`
}

func (s *ProductService) CheckProductExists(ctx context.Context, productID uuid.UUID, tenantID uuid.UUID) (bool, error) {
	exists, err := s.repo.CheckProductExists(ctx, productID, tenantID)
	if err != nil {
		log.Error().Err(err).Msg("failed to check if product exists")
		return false, err
	}
	return exists, nil
}

func (s *ProductService) CountProducts(ctx context.Context, tenantID uuid.UUID) (int64, error) {
	count, err := s.repo.CountProducts(ctx, tenantID)
	if err != nil {
		log.Error().Err(err).Msg("failed to count products")
		return 0, err
	}
	return count, nil
}

func (s *ProductService) CreateProduct(ctx context.Context, tenantID uuid.UUID, sku string, name string, price int, description string, imageUrl string, brand string, unitID uuid.UUID, pricePerUnit int, gstPercent int) (*models.Product, error) {
	params := repositories.CreateProductParams{
		TenantID:     tenantID,
		SKU:          sku,
		Name:         name,
		Price:        decimal.NewFromInt(int64(price)),
		Description:  &description,
		ImageURL:     &imageUrl,
		Brand:        &brand,
		UnitID:       unitID,
		PricePerUnit: func() *decimal.Decimal { d := decimal.NewFromInt(int64(pricePerUnit)); return &d }(),
		GSTPercent:   func() *decimal.Decimal { d := decimal.NewFromInt(int64(gstPercent)); return &d }(),
	}

	product, err := s.repo.CreateProductFromParams(ctx, params)
	if err != nil {
		log.Error().Err(err).Msg("failed to create product")
		return nil, err
	}
	return product, nil
}

func (s *ProductService) CreateUnit(ctx context.Context, ID uuid.UUID, tenantID uuid.UUID, name string, abbreviation string) (*models.Unit, error) {
	params := repositories.CreateUnitParams{
		TenantID:     tenantID,
		Name:         name,
		Abbreviation: abbreviation,
	}
	unit, err := s.repo.CreateUnitFromParams(ctx, params)
	if err != nil {
		log.Error().Err(err).Msg("unit creation failed")
		return nil, err
	}
	return unit, nil
}

func (s *ProductService) GetProductByID(ctx context.Context, ID uuid.UUID, tenantID uuid.UUID) (*models.Product, error) {
	product, err := s.repo.GetProductByID(ctx, ID, tenantID)
	if err != nil {
		log.Error().Err(err).Msg("failed to get product by ID")
		return nil, err
	}
	return product, nil
}

func (s *ProductService) GetProductBySKU(ctx context.Context, sku string, tenantID uuid.UUID) (*models.Product, error) {
	product, err := s.repo.GetProductBySKU(ctx, sku, tenantID)
	if err != nil {
		log.Error().Err(err).Msg("failed to get product by sku")
		return nil, err
	}
	return product, nil
}

func (s *ProductService) GetUnitByID(ctx context.Context, ID uuid.UUID, tenantID uuid.UUID) (*models.Unit, error) {
	unit, err := s.repo.GetUnitByID(ctx, ID, tenantID)
	if err != nil {
		log.Error().Err(err).Msg("failed to get unit by ID")
		return nil, err
	}
	return unit, nil
}

func (s *ProductService) ListProducts(ctx context.Context, tenantID uuid.UUID, limit, offset int) ([]models.Product, error) {
	products, err := s.repo.ListProducts(ctx, tenantID, limit, offset)
	if err != nil {
		log.Error().Err(err).Msg("failed to list products")
		return nil, err
	}
	return products, nil
}

func (s *ProductService) ListUnits(ctx context.Context, tenantID uuid.UUID, limit int, offset int) ([]models.Unit, error) {
	units, err := s.repo.ListUnits(ctx, tenantID, limit, offset)
	if err != nil {
		return nil, err
	}
	return units, nil
}

func (s *ProductService) SearchProducts(ctx context.Context, tenantID uuid.UUID, name string, limit int, offset int) ([]models.Product, error) {
	products, err := s.repo.SearchProducts(ctx, tenantID, name, limit, offset)
	if err != nil {
		log.Error().Err(err).Msg("failed to search products")
		return nil, err
	}
	return products, nil
}

func (s *ProductService) PatchProduct(ctx context.Context, tenantID, productID uuid.UUID, patch ProductInputRequest) error {
	updates := make(map[string]interface{})
	
	if patch.Name != nil {
		updates["name"] = *patch.Name
	}
	if patch.Price != nil {
		updates["price"] = decimal.NewFromInt(int64(*patch.Price))
	}
	if patch.Description != nil {
		updates["description"] = *patch.Description
	}
	if patch.ImageUrl != nil {
		updates["image_url"] = *patch.ImageUrl
	}
	if patch.Brand != nil {
		updates["brand"] = *patch.Brand
	}
	if patch.UnitID != nil {
		updates["unit_id"] = *patch.UnitID
	}
	if patch.PricePerUnit != nil {
		updates["price_per_unit"] = decimal.NewFromInt(int64(*patch.PricePerUnit))
	}
	if patch.GstPercent != nil {
		updates["gst_percent"] = decimal.NewFromInt(int64(*patch.GstPercent))
	}

	err := s.repo.UpdateProduct(ctx, productID, tenantID, updates)
	if err != nil {
		log.Error().Err(err).Msg("failed to patch product")
		return err
	}
	return nil
}
