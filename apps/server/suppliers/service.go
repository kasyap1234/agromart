package suppliers

import (
	"context"
	"fmt"

	"agromart2/db"
	"agromart2/internal/utils"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rs/zerolog/log"
)

type SupplierService struct {
	db *pgxpool.Pool
	q  *db.Queries
}

func NewSupplierService(db *pgxpool.Pool, queries *db.Queries) *SupplierService {
	return &SupplierService{
		db: db,
		q:  queries,
	}
}

type CreateSupplierParams struct {
	TenantID      uuid.UUID
	Name          string
	ContactPerson string
	Email         string
	Phone         string
	Address       string
	TaxID         string
	PaymentMode   string
}

type UpdateSupplierParams struct {
	ID            uuid.UUID
	TenantID      uuid.UUID
	Name          string
	ContactPerson string
	Email         string
	Phone         string
	Address       string
	TaxID         string
	PaymentMode   string
	IsActive      bool
}

// CreateSupplier creates a new supplier
func (s *SupplierService) CreateSupplier(ctx context.Context, params CreateSupplierParams) (db.Supplier, error) {
	args := db.CreateSupplierParams{
		TenantID:      params.TenantID,
		Name:          params.Name,
		ContactPerson: utils.P.Text(params.ContactPerson),
		Email:         utils.P.Text(params.Email),
		Phone:         utils.P.Text(params.Phone),
		Address:       utils.P.Text(params.Address),
		TaxID:         utils.P.Text(params.TaxID),
		PaymentMode:   utils.P.Text(params.PaymentMode),
	}

	supplier, err := s.q.CreateSupplier(ctx, args)
	if err != nil {
		log.Error().Err(err).Msg("failed to create supplier")
		return db.Supplier{}, fmt.Errorf("failed to create supplier: %w", err)
	}

	return supplier, nil
}

// GetSupplierByID retrieves a supplier by ID
func (s *SupplierService) GetSupplierByID(ctx context.Context, id, tenantID uuid.UUID) (db.Supplier, error) {
	args := db.GetSupplierByIDParams{
		ID:       id,
		TenantID: tenantID,
	}

	supplier, err := s.q.GetSupplierByID(ctx, args)
	if err != nil {
		log.Error().Err(err).Msg("failed to get supplier by ID")
		return db.Supplier{}, fmt.Errorf("supplier not found: %w", err)
	}

	return supplier, nil
}

// ListSuppliers lists all suppliers for a tenant
func (s *SupplierService) ListSuppliers(ctx context.Context, tenantID uuid.UUID, limit, offset int32) ([]db.Supplier, error) {
	args := db.ListSuppliersParams{
		TenantID: tenantID,
		Limit:    limit,
		Offset:   offset,
	}

	suppliers, err := s.q.ListSuppliers(ctx, args)
	if err != nil {
		log.Error().Err(err).Msg("failed to list suppliers")
		return []db.Supplier{}, fmt.Errorf("failed to list suppliers: %w", err)
	}

	return suppliers, nil
}

// ListActiveSuppliers lists only active suppliers
func (s *SupplierService) ListActiveSuppliers(ctx context.Context, tenantID uuid.UUID, limit, offset int32) ([]db.Supplier, error) {
	args := db.ListActiveSuppliersParams{
		TenantID: tenantID,
		Limit:    limit,
		Offset:   offset,
	}

	suppliers, err := s.q.ListActiveSuppliers(ctx, args)
	if err != nil {
		log.Error().Err(err).Msg("failed to list active suppliers")
		return []db.Supplier{}, fmt.Errorf("failed to list active suppliers: %w", err)
	}

	return suppliers, nil
}

// UpdateSupplier updates a supplier
func (s *SupplierService) UpdateSupplier(ctx context.Context, params UpdateSupplierParams) (db.Supplier, error) {
	args := db.UpdateSupplierParams{
		ID:            params.ID,
		TenantID:      params.TenantID,
		Name:          params.Name,
		ContactPerson: utils.P.Text(params.ContactPerson),
		Email:         utils.P.Text(params.Email),
		Phone:         utils.P.Text(params.Phone),
		Address:       utils.P.Text(params.Address),
		TaxID:         utils.P.Text(params.TaxID),
		PaymentMode:   utils.P.Text(params.PaymentMode),
		IsActive:      utils.P.Bool(params.IsActive),
	}

	supplier, err := s.q.UpdateSupplier(ctx, args)
	if err != nil {
		log.Error().Err(err).Msg("failed to update supplier")
		return db.Supplier{}, fmt.Errorf("failed to update supplier: %w", err)
	}

	return supplier, nil
}

// DeleteSupplier soft deletes a supplier (sets is_active to false)
func (s *SupplierService) DeleteSupplier(ctx context.Context, id, tenantID uuid.UUID) error {
	args := db.DeactivateSupplierParams{
		ID:       id,
		TenantID: tenantID,
	}

	err := s.q.DeactivateSupplier(ctx, args)
	if err != nil {
		log.Error().Err(err).Msg("failed to deactivate supplier")
		return fmt.Errorf("failed to deactivate supplier: %w", err)
	}

	return nil
}

// SearchSuppliers searches suppliers by name
func (s *SupplierService) SearchSuppliers(ctx context.Context, tenantID uuid.UUID, searchTerm string, limit, offset int32) ([]db.Supplier, error) {
	args := db.SearchSuppliersParams{
		TenantID: tenantID,
		Name:     "%" + searchTerm + "%",
		Limit:    limit,
		Offset:   offset,
	}

	suppliers, err := s.q.SearchSuppliers(ctx, args)
	if err != nil {
		log.Error().Err(err).Msg("failed to search suppliers")
		return []db.Supplier{}, fmt.Errorf("failed to search suppliers: %w", err)
	}

	return suppliers, nil
}

// CountSuppliers counts total suppliers for a tenant
func (s *SupplierService) CountSuppliers(ctx context.Context, tenantID uuid.UUID) (int64, error) {
	count, err := s.q.CountSuppliers(ctx, tenantID)
	if err != nil {
		log.Error().Err(err).Msg("failed to count suppliers")
		return 0, fmt.Errorf("failed to count suppliers: %w", err)
	}

	return count, nil
}

// CheckSupplierExists checks if a supplier exists
func (s *SupplierService) CheckSupplierExists(ctx context.Context, id, tenantID uuid.UUID) (bool, error) {
	args := db.CheckSupplierExistsParams{
		ID:       id,
		TenantID: tenantID,
	}

	exists, err := s.q.CheckSupplierExists(ctx, args)
	if err != nil {
		log.Error().Err(err).Msg("failed to check supplier existence")
		return false, fmt.Errorf("failed to check supplier existence: %w", err)
	}

	return exists, nil
}