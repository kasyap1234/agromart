package products

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"agromart2/db"
	"agromart2/internal/database"
	"agromart2/internal/utils"
	"github.com/rs/zerolog/log"
)

type ProductService struct {
	db *pgxpool.Pool
	q  *db.Queries
}

func NewProductService(db *pgxpool.Pool, query *db.Queries) *ProductService {
	return &ProductService{
		db: db,
		q:  query,
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

type CreateProductParams struct {
	TenantID     uuid.UUID
	SKU          string
	Name         string
	Price        int
	Description  string
	ImageURL     string
	Brand        string
	UnitID       uuid.UUID
	PricePerUnit int
	GSTPercent   int
}

func (s *ProductService) CheckProductExists(ctx context.Context, productID uuid.UUID, tenantID uuid.UUID) (bool, error) {
	args := db.CheckProductExistsParams{
		ID:       productID,
		TenantID: tenantID,
	}
	exists, err := s.q.CheckProductExists(ctx, args)
	if err != nil {
		return false, database.WrapError(err, "failed to check if product exists")
	}
	return exists, nil
}

func (s *ProductService) CountProducts(ctx context.Context, tenantID uuid.UUID) (int64, error) {
	count, err := s.q.CountProducts(ctx, tenantID)
	if err != nil {
		log.Error().Err(err).Msg("failed to count products")
		return 0, err
	}
	return count, nil
}

func (s *ProductService) CreateProduct(ctx context.Context, params CreateProductParams) (db.Product, error) {
	args := db.CreateProductParams{
		TenantID:     params.TenantID,
		Sku:          params.SKU,
		Name:         params.Name,
		Price:        utils.P.Numeric(params.Price),
		Description:  utils.P.Text(params.Description),
		ImageUrl:     utils.P.Text(params.ImageURL),
		Brand:        utils.P.Text(params.Brand),
		UnitID:       params.UnitID,
		PricePerUnit: utils.P.Numeric(params.PricePerUnit),
		GstPercent:   utils.P.Numeric(params.GSTPercent),
	}

	product, err := s.q.CreateProduct(ctx, args)
	if err != nil {
		log.Error().Err(err).Msg("failed to create product")
		return db.Product{}, err
	}
	return product, nil
}

// Legacy method for backward compatibility
func (s *ProductService) CreateProductLegacy(ctx context.Context, tenantID uuid.UUID, sku string, name string, price int, description string, imageUrl string, brand string, unitID uuid.UUID, pricePerUnit int, GstPercent int) (db.Product, error) {
	return s.CreateProduct(ctx, CreateProductParams{
		TenantID:     tenantID,
		SKU:          sku,
		Name:         name,
		Price:        price,
		Description:  description,
		ImageURL:     imageUrl,
		Brand:        brand,
		UnitID:       unitID,
		PricePerUnit: pricePerUnit,
		GSTPercent:   GstPercent,
	})
}

func (s *ProductService) CreateUnit(ctx context.Context, ID uuid.UUID, tenantID uuid.UUID, name string, abbreviation string) (db.Unit, error) {
	args := db.CreateUnitParams{
		TenantID:     tenantID,
		Name:         name,
		Abbreviation: abbreviation,
	}
	unit, err := s.q.CreateUnit(ctx, args)
	if err != nil {
		log.Error().Err(err).Msg("unit creation failed")
		return db.Unit{}, err
	}
	return unit, nil
}

func (s *ProductService) GetProductByID(ctx context.Context, ID uuid.UUID, tenantID uuid.UUID) (db.Product, error) {
	args := db.GetProductByIDParams{
		ID:       ID,
		TenantID: tenantID,
	}
	product, err := s.q.GetProductByID(ctx, args)

	if err != nil {
		log.Error().Err(err).Msg("failed to get product by ID")

		return db.Product{}, err
	}
	return product, nil
}

func (s *ProductService) GetProductBySKU(ctx context.Context, sku string, tenantID uuid.UUID) (db.Product, error) {
	args := db.GetProductBySKUParams{
		Sku:      sku,
		TenantID: tenantID,
	}
	product, err := s.q.GetProductBySKU(ctx, args)
	if err != nil {
		log.Error().Err(err).Msg("failed to get product by sku")
		return db.Product{}, err
	}
	return product, nil
}

func (s *ProductService) GetUnitByID(ctx context.Context, ID uuid.UUID, tenantID uuid.UUID) (db.Unit, error) {
	args := db.GetUnitByIDParams{
		ID:       ID,
		TenantID: tenantID,
	}
	unit, err := s.q.GetUnitByID(ctx, args)
	if err != nil {
		log.Error().Err(err).Msg("failed to get unit by ID")
		return db.Unit{}, err
	}
	return unit, nil
}

func (s *ProductService) ListProducts(ctx context.Context, tenantID uuid.UUID, limit, offset int) ([]db.Product, error) {
	args := db.ListProductsParams{
		TenantID: tenantID,
		Limit:    int32(limit),
		Offset:   int32(offset),
	}
	products, err := s.q.ListProducts(ctx, args)
	if err != nil {
		log.Error().Err(err).Msg("failed to list products")
		return []db.Product{}, err
	}
	return products, nil
}

func (s *ProductService) ListUnits(ctx context.Context, tenantID uuid.UUID, limit int, offset int) ([]db.Unit, error) {
	args := db.ListUnitsParams{
		TenantID: tenantID,
		Limit:    int32(limit),
		Offset:   int32(offset),
	}
	units, err := s.q.ListUnits(ctx, args)
	if err != nil {
		return []db.Unit{}, err
	}
	return units, nil
}

func (s *ProductService) SearchProducts(ctx context.Context, tenantID uuid.UUID, name string, limit int, offset int) ([]db.Product, error) {
	args := db.SearchProductsParams{
		TenantID: tenantID,
		Name:     name,
		Limit:    int32(limit),
		Offset:   int32(offset),
	}
	products, err := s.q.SearchProducts(ctx, args)
	if err != nil {
		log.Error().Err(err).Msg("failed to search products")
		return []db.Product{}, err
	}
	return products, nil
}

func ToUpdateProductPatchParms(p ProductInputRequest, productID, tenantID uuid.UUID) db.UpdateProductPatchParams {
	return db.UpdateProductPatchParams{
		ID:           productID,
		TenantID:     tenantID,
		Name:         utils.P.TextPtr(p.Name),
		Price:        utils.P.NumericPtr(p.Price),
		Description:  utils.P.TextPtr(p.Description),
		ImageUrl:     utils.P.TextPtr(p.ImageUrl),
		Brand:        utils.P.TextPtr(p.Brand),
		PricePerUnit: utils.P.NumericPtr(p.PricePerUnit),
		GstPercent:   utils.P.NumericPtr(p.GstPercent),
		UnitID:       utils.P.UUIDPtr(p.UnitID),
	}
}
func (s *ProductService) PatchProduct(ctx context.Context, tenantID, productID uuid.UUID, patch ProductInputRequest) error {
	params := ToUpdateProductPatchParms(patch, productID, tenantID)
	err := s.q.UpdateProductPatch(ctx, params)
	if err != nil {
		log.Error().Err(err).Msg("failed to patch product")
		return err
	}
	return nil

}
