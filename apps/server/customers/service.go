package customers

import (
	"context"
	"fmt"

	"agromart2/db"
	"agromart2/internal/utils"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rs/zerolog/log"
)

type CustomerService struct {
	db *pgxpool.Pool
	q  *db.Queries
}

func NewCustomerService(db *pgxpool.Pool, queries *db.Queries) *CustomerService {
	return &CustomerService{
		db: db,
		q:  queries,
	}
}

type CreateCustomerParams struct {
	TenantID      uuid.UUID
	Name          string
	ContactPerson string
	Email         string
	Phone         string
	Address       string
	PaymentMode   string
}

type UpdateCustomerParams struct {
	ID            uuid.UUID
	TenantID      uuid.UUID
	Name          string
	ContactPerson string
	Email         string
	Phone         string
	Address       string
	PaymentMode   string
	IsActive      bool
}

// CreateCustomer creates a new customer
func (s *CustomerService) CreateCustomer(ctx context.Context, params CreateCustomerParams) (db.Customer, error) {
	args := db.CreateCustomerParams{
		TenantID:      params.TenantID,
		Name:          params.Name,
		ContactPerson: utils.P.Text(params.ContactPerson),
		Email:         utils.P.Text(params.Email),
		Phone:         utils.P.Text(params.Phone),
		Address:       utils.P.Text(params.Address),
		PaymentMode:   utils.P.Text(params.PaymentMode),
	}

	customer, err := s.q.CreateCustomer(ctx, args)
	if err != nil {
		log.Error().Err(err).Msg("failed to create customer")
		return db.Customer{}, fmt.Errorf("failed to create customer: %w", err)
	}

	return customer, nil
}

// GetCustomerByID retrieves a customer by ID
func (s *CustomerService) GetCustomerByID(ctx context.Context, id, tenantID uuid.UUID) (db.Customer, error) {
	args := db.GetCustomerByIDParams{
		ID:       id,
		TenantID: tenantID,
	}

	customer, err := s.q.GetCustomerByID(ctx, args)
	if err != nil {
		log.Error().Err(err).Msg("failed to get customer by ID")
		return db.Customer{}, fmt.Errorf("customer not found: %w", err)
	}

	return customer, nil
}

// ListCustomers lists all customers for a tenant
func (s *CustomerService) ListCustomers(ctx context.Context, tenantID uuid.UUID, limit, offset int32) ([]db.Customer, error) {
	args := db.ListCustomersParams{
		TenantID: tenantID,
		Limit:    limit,
		Offset:   offset,
	}

	customers, err := s.q.ListCustomers(ctx, args)
	if err != nil {
		log.Error().Err(err).Msg("failed to list customers")
		return []db.Customer{}, fmt.Errorf("failed to list customers: %w", err)
	}

	return customers, nil
}

// ListActiveCustomers lists only active customers
func (s *CustomerService) ListActiveCustomers(ctx context.Context, tenantID uuid.UUID, limit, offset int32) ([]db.Customer, error) {
	args := db.ListActiveCustomersParams{
		TenantID: tenantID,
		Limit:    limit,
		Offset:   offset,
	}

	customers, err := s.q.ListActiveCustomers(ctx, args)
	if err != nil {
		log.Error().Err(err).Msg("failed to list active customers")
		return []db.Customer{}, fmt.Errorf("failed to list active customers: %w", err)
	}

	return customers, nil
}

// UpdateCustomer updates a customer
func (s *CustomerService) UpdateCustomer(ctx context.Context, params UpdateCustomerParams) (db.Customer, error) {
	args := db.UpdateCustomerParams{
		ID:            params.ID,
		Name:          params.Name,
		ContactPerson: utils.P.Text(params.ContactPerson),
		Email:         utils.P.Text(params.Email),
		Phone:         utils.P.Text(params.Phone),
		Address:       utils.P.Text(params.Address),
		PaymentMode:   utils.P.Text(params.PaymentMode),
		IsActive:      utils.P.Bool(params.IsActive),
		TenantID:      params.TenantID,
	}

	customer, err := s.q.UpdateCustomer(ctx, args)
	if err != nil {
		log.Error().Err(err).Msg("failed to update customer")
		return db.Customer{}, fmt.Errorf("failed to update customer: %w", err)
	}

	return customer, nil
}

// DeleteCustomer soft deletes a customer (sets is_active to false)
func (s *CustomerService) DeleteCustomer(ctx context.Context, id, tenantID uuid.UUID) error {
	args := db.DeactivateCustomerParams{
		ID:       id,
		TenantID: tenantID,
	}

	err := s.q.DeactivateCustomer(ctx, args)
	if err != nil {
		log.Error().Err(err).Msg("failed to deactivate customer")
		return fmt.Errorf("failed to deactivate customer: %w", err)
	}

	return nil
}

// SearchCustomers searches customers by name
func (s *CustomerService) SearchCustomers(ctx context.Context, tenantID uuid.UUID, searchTerm string, limit, offset int32) ([]db.Customer, error) {
	args := db.SearchCustomersParams{
		TenantID: tenantID,
		Name:     "%" + searchTerm + "%",
		Limit:    limit,
		Offset:   offset,
	}

	customers, err := s.q.SearchCustomers(ctx, args)
	if err != nil {
		log.Error().Err(err).Msg("failed to search customers")
		return []db.Customer{}, fmt.Errorf("failed to search customers: %w", err)
	}

	return customers, nil
}

// CountCustomers counts total customers for a tenant
func (s *CustomerService) CountCustomers(ctx context.Context, tenantID uuid.UUID) (int64, error) {
	count, err := s.q.CountCustomers(ctx, tenantID)
	if err != nil {
		log.Error().Err(err).Msg("failed to count customers")
		return 0, fmt.Errorf("failed to count customers: %w", err)
	}

	return count, nil
}

// CheckCustomerExists checks if a customer exists
func (s *CustomerService) CheckCustomerExists(ctx context.Context, id, tenantID uuid.UUID) (bool, error) {
	args := db.CheckCustomerExistsParams{
		ID:       id,
		TenantID: tenantID,
	}

	exists, err := s.q.CheckCustomerExists(ctx, args)
	if err != nil {
		log.Error().Err(err).Msg("failed to check customer existence")
		return false, fmt.Errorf("failed to check customer existence: %w", err)
	}

	return exists, nil
}