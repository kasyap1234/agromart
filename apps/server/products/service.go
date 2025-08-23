package products

import (
	"context"
	"database/sql"
	"net/http"
	"strconv"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"agromart2/db"
	"agromart2/internal/database"
	"agromart2/internal/errors"
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
	// DEV DIAGNOSTICS: observe values arriving from handler
	log.Info().
		Str("sku", params.SKU).
		Str("name", params.Name).
		Int("price", params.Price).
		Int("price_per_unit", params.PricePerUnit).
		Int("gst_percent", params.GSTPercent).
		Str("tenant_id", params.TenantID.String()).
		Str("unit_id", params.UnitID.String()).
		Msg("[DEV] products.CreateProduct params (pgconv)")

	// Use direct conversions for database/sql types
	args := db.CreateProductParams{
		TenantID:     params.TenantID,
		Sku:          params.SKU,
		Name:         params.Name,
		Price:        strconv.Itoa(params.Price),
		Description:  sql.NullString{String: params.Description, Valid: params.Description != ""},
		ImageUrl:     sql.NullString{String: params.ImageURL, Valid: params.ImageURL != ""},
		Brand:        sql.NullString{String: params.Brand, Valid: params.Brand != ""},
		UnitID:       params.UnitID,
		PricePerUnit: sql.NullString{String: strconv.Itoa(params.PricePerUnit), Valid: true},
		GstPercent:   sql.NullString{String: strconv.Itoa(params.GSTPercent), Valid: true},
	}

	product, err := s.q.CreateProduct(ctx, args)
	if err != nil {
		log.Error().Err(err).Msg("failed to create product (pgconv)")
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
		Name:         stringPtrToNullString(p.Name),
		Price:        intPtrToNullString(p.Price),
		Description:  stringPtrToNullString(p.Description),
		ImageUrl:     stringPtrToNullString(p.ImageUrl),
		Brand:        stringPtrToNullString(p.Brand),
		PricePerUnit: intPtrToNullString(p.PricePerUnit),
		GstPercent:   intPtrToNullString(p.GstPercent),
		UnitID:       uuidPtrToNullUUID(p.UnitID),
	}
}

// Helper functions for converting pointers to sql.NullString/NullUUID
func stringPtrToNullString(s *string) sql.NullString {
	if s == nil {
		return sql.NullString{Valid: false}
	}
	return sql.NullString{String: *s, Valid: true}
}

func intPtrToNullString(i *int) sql.NullString {
	if i == nil {
		return sql.NullString{Valid: false}
	}
	return sql.NullString{String: strconv.Itoa(*i), Valid: true}
}

func uuidPtrToNullUUID(u *uuid.UUID) uuid.NullUUID {
	if u == nil {
		return uuid.NullUUID{Valid: false}
	}
	return uuid.NullUUID{UUID: *u, Valid: true}
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

// DeleteProduct deletes a product by ID
func (s *ProductService) DeleteProduct(ctx context.Context, productID uuid.UUID, tenantID uuid.UUID) error {
	// First check if product exists and belongs to tenant
	exists, err := s.CheckProductExists(ctx, productID, tenantID)
	if err != nil {
		return errors.Wrap(err, http.StatusInternalServerError, "failed to check product existence")
	}
	if !exists {
		return errors.NewNotFound("product not found")
	}

	// Delete the product (cascade will handle related records)
	err = s.q.DeleteProduct(ctx, db.DeleteProductParams{
		ID:       productID,
		TenantID: tenantID,
	})
	if err != nil {
		log.Error().Err(err).Msg("failed to delete product")
		return errors.Wrap(err, http.StatusInternalServerError, "failed to delete product")
	}
	return nil
}
