package sales

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"agromart2/db"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Service struct {
	db *pgxpool.Pool
	q  *db.Queries
}

func NewService(db *pgxpool.Pool, queries *db.Queries) *Service {
	return &Service{
		db: db,
		q:  queries,
	}
}

type CreateSalesOrderParams struct {
	TenantID             uuid.UUID
	SoNumber             string
	CustomerID           uuid.UUID
	LocationID           *uuid.UUID
	ExpectedDeliveryDate *time.Time
	TotalAmount          int
	TaxAmount            int
	DiscountAmount       int
	FinalAmount          int
	Notes                string
	CreatedBy            uuid.UUID
	Items                []CreateSalesOrderItemParams
}

type CreateSalesOrderItemParams struct {
	ProductID       uuid.UUID
	BatchID         *uuid.UUID
	QuantityOrdered int
	UnitPrice       int
	TotalPrice      int
	TaxPercent      int
	DiscountPercent int
	Notes           string
}

func (s *Service) CreateSalesOrder(ctx context.Context, params CreateSalesOrderParams) (db.SalesOrder, error) {
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return db.SalesOrder{}, fmt.Errorf("failed to start tx: %w", err)
	}
	defer tx.Rollback(ctx)

	// For now, use direct queries instead of WithTx due to pgx to sql.Tx conversion issues
	// TODO: Use proper transaction handling when conversion is fixed
	soArgs := db.CreateSalesOrderParams{
		TenantID:   params.TenantID,
		SoNumber:   params.SoNumber,
		CustomerID: params.CustomerID,
		CreatedBy:  uuid.NullUUID{UUID: params.CreatedBy, Valid: true},
	}
	if params.LocationID != nil {
		soArgs.LocationID = uuid.NullUUID{UUID: *params.LocationID, Valid: true}
	}

	so, err := s.q.CreateSalesOrder(ctx, soArgs)
	if err != nil {
		return db.SalesOrder{}, fmt.Errorf("failed to create sales order: %w", err)
	}

	for _, it := range params.Items {
		itemArgs := db.CreateSalesOrderItemParams{
			TenantID:        params.TenantID,
			SalesOrderID:    so.ID,
			ProductID:       it.ProductID,
			QuantityOrdered: fmt.Sprintf("%d", it.QuantityOrdered),
			UnitPrice:       fmt.Sprintf("%d", it.UnitPrice),
			TotalPrice:      fmt.Sprintf("%d", it.TotalPrice),
		}
		if _, err := s.q.CreateSalesOrderItem(ctx, itemArgs); err != nil {
			return db.SalesOrder{}, fmt.Errorf("failed to create sales order item: %w", err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return db.SalesOrder{}, fmt.Errorf("commit failed: %w", err)
	}
	return so, nil
}

func (s *Service) GetSalesOrder(ctx context.Context, id, tenantID uuid.UUID) (db.SalesOrder, error) {
	return s.q.GetSalesOrder(ctx, db.GetSalesOrderParams{
		ID:       id,
		TenantID: tenantID,
	})
}

func (s *Service) GetSalesOrderItems(ctx context.Context, salesOrderID, tenantID uuid.UUID) ([]db.SalesOrderItem, error) {
	return s.q.GetSalesOrderItems(ctx, db.GetSalesOrderItemsParams{
		SalesOrderID: salesOrderID,
		TenantID:     tenantID,
	})
}

func (s *Service) UpdateSalesOrderStatus(ctx context.Context, id, tenantID uuid.UUID, status string) error {
	return s.q.UpdateSalesOrderStatus(ctx, db.UpdateSalesOrderStatusParams{
		Status:   status,
		ID:       id,
		TenantID: tenantID,
	})
}

func (s *Service) UpdateSalesOrderItemQuantityShipped(ctx context.Context, itemID, tenantID uuid.UUID, qty int) (db.SalesOrderItem, error) {
	return s.q.UpdateSalesOrderItemQuantityShipped(ctx, db.UpdateSalesOrderItemQuantityShippedParams{
		ID:              itemID,
		QuantityShipped: sql.NullString{String: fmt.Sprintf("%d", qty), Valid: true},
		TenantID:        tenantID,
	})
}

func (s *Service) ListSalesOrdersByCustomer(ctx context.Context, tenantID, customerID uuid.UUID, limit, offset int32) ([]db.SalesOrder, error) {
	return s.q.ListSalesOrdersByCustomer(ctx, db.ListSalesOrdersByCustomerParams{
		TenantID:   tenantID,
		CustomerID: customerID,
		Limit:      limit,
		Offset:     offset,
	})
}

func (s *Service) GetSalesReportByDate(ctx context.Context, tenantID uuid.UUID, from, to time.Time) ([]db.GetSalesReportByDateRow, error) {
	return s.q.GetSalesReportByDate(ctx, db.GetSalesReportByDateParams{
		TenantID:    tenantID,
		OrderDate:   from,
		OrderDate_2: to,
	})
}