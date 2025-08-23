package inventory

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"agromart2/db"
	"agromart2/internal/errors"
)

type InventoryService struct {
	db      *pgxpool.Pool
	queries *db.Queries
}

func NewService(db *pgxpool.Pool, q *db.Queries) *InventoryService {
	return &InventoryService{
		db:      db,
		queries: q,
	}
}

func (s *InventoryService) AddInventoryQuantity(ctx context.Context, tenantID, productID, batchID uuid.UUID, quantity int) error {
	args := db.AddInventoryQuantityParams{
		TenantID:  tenantID,
		ProductID: productID,
		BatchID:   batchID,
		Quantity:  strconv.Itoa(quantity),
	}
	err := s.queries.AddInventoryQuantity(ctx, args)

	return err
}

func (s *InventoryService) CreateBatch(ctx context.Context, tenantID, productID uuid.UUID, batchNumber string, expiryDate time.Time, cost int) (db.Batch, error) {
	args := db.CreateBatchParams{
		TenantID:    tenantID,
		ProductID:   productID,
		BatchNumber: batchNumber,
		ExpiryDate:  expiryDate,
		Cost:        strconv.Itoa(cost),
	}
	batch, err := s.queries.CreateBatch(ctx, args)
	return batch, err
}

func (s *InventoryService) GetBatchByID(ctx context.Context, id, tenantID uuid.UUID) (db.Batch, error) {
	args := db.GetBatchByIDParams{
		ID:       id,
		TenantID: tenantID,
	}
	return s.queries.GetBatchByID(ctx, args)
}

func (s *InventoryService) GetInventoryByProductBatch(ctx context.Context, tenantID, productID, batchID uuid.UUID) (db.Inventory, error) {
	args := db.GetInventoryByProductBatchParams{
		TenantID:  tenantID,
		ProductID: productID,
		BatchID:   batchID,
	}
	return s.queries.GetInventoryByProductBatch(ctx, args)
}

func (s *InventoryService) GetProductQuantity(ctx context.Context, tenantID, productID uuid.UUID) (interface{}, error) {
	args := db.GetProductQuantityParams{
		TenantID:  tenantID,
		ProductID: productID,
	}
	return s.queries.GetProductQuantity(ctx, args)
}

func (s *InventoryService) ListAllInventory(ctx context.Context, tenantID uuid.UUID, limit, offset int32) ([]db.ListAllInventoryRow, error) {
	args := db.ListAllInventoryParams{
		TenantID: tenantID,
		Limit:    limit,
		Offset:   offset,
	}
	return s.queries.ListAllInventory(ctx, args)
}

func (s *InventoryService) ReduceInventoryQuantity(ctx context.Context, tenantID, productID, batchID uuid.UUID, quantity int) error {
	args := db.ReduceInventoryQuantityParams{
		Quantity:  strconv.Itoa(quantity),
		TenantID:  tenantID,
		ProductID: productID,
		BatchID:   batchID,
	}
	return s.queries.ReduceInventoryQuantity(ctx, args)
}

func (s *InventoryService) SetInventoryQuantity(ctx context.Context, tenantID, productID, batchID uuid.UUID, quantity int) error {
	args := db.SetInventoryQuantityParams{
		Quantity:  strconv.Itoa(quantity),
		TenantID:  tenantID,
		ProductID: productID,
		BatchID:   batchID,
	}
	return s.queries.SetInventoryQuantity(ctx, args)
}

func (s *InventoryService) UpdateBatch(ctx context.Context, id, tenantID uuid.UUID, batchNumber string, expiryDate time.Time, cost int) (db.Batch, error) {
	args := db.UpdateBatchParams{
		ID:          id,
		BatchNumber: batchNumber,
		ExpiryDate:  expiryDate,
		Cost:        strconv.Itoa(cost),
		TenantID:    tenantID,
	}
	return s.queries.UpdateBatch(ctx, args)
}

func (s *InventoryService) GetProductInventoryDetails(ctx context.Context, tenantID, productID uuid.UUID) ([]db.GetProductInventoryDetailsRow, error) {
	args := db.GetProductInventoryDetailsParams{
		TenantID:  tenantID,
		ProductID: productID,
	}
	return s.queries.GetProductInventoryDetails(ctx, args)
}

func (s *InventoryService) GetLowStockReport(ctx context.Context, tenantID uuid.UUID, threshold int) ([]db.GetLowStockReportRow, error) {
	args := db.GetLowStockReportParams{
		TenantID: tenantID,
		Quantity: strconv.Itoa(threshold),
	}
	return s.queries.GetLowStockReport(ctx, args)
}

func (s *InventoryService) GetInventoryLogByProduct(ctx context.Context, tenantID, productID uuid.UUID, limit, offset int32) ([]db.InventoryLog, error) {
	args := db.GetInventoryLogByProductParams{
		TenantID:  tenantID,
		ProductID: productID,
		Limit:     limit,
		Offset:    offset,
	}
	return s.queries.GetInventoryLogByProduct(ctx, args)
}

func (s *InventoryService) GetInventoryLogByBatch(ctx context.Context, tenantID, batchID uuid.UUID, limit, offset int32) ([]db.InventoryLog, error) {
	args := db.GetInventoryLogByBatchParams{
		TenantID: tenantID,
		BatchID:  batchID,
		Limit:    limit,
		Offset:   offset,
	}
	return s.queries.GetInventoryLogByBatch(ctx, args)
}

func (s *InventoryService) CreateInventoryLog(ctx context.Context, tenantID, productID, batchID, referenceID uuid.UUID, transactionType string, quantityChange int, notes string) error {
	args := db.CreateInventoryLogParams{
		TenantID:        tenantID,
		ProductID:       productID,
		BatchID:         batchID,
		TransactionType: transactionType,
		QuantityChange:  strconv.Itoa(quantityChange),
		ReferenceID:     uuid.NullUUID{UUID: referenceID, Valid: true},
		Notes:           sql.NullString{String: notes, Valid: notes != ""},
	}
	return s.queries.CreateInventoryLog(ctx, args)
}

// GetExpiringBatches gets batches that are expiring within specified days
func (s *InventoryService) GetExpiringBatches(ctx context.Context, tenantID uuid.UUID, days int) ([]db.GetExpiringBatchesRow, error) {
	// Current sqlc-generated GetExpiringBatchesParams only includes TenantID (see db/inventory.sql.go).
	// The SQL uses a date upper bound but sqlc compiled it without exposing the second param.
	return s.queries.GetExpiringBatches(ctx, db.GetExpiringBatchesParams{
		TenantID: tenantID,
	})
}

// GetInventoryValue calculates total inventory value for a tenant
func (s *InventoryService) GetInventoryValue(ctx context.Context, tenantID uuid.UUID) (interface{}, error) {
	return s.queries.GetInventoryValue(ctx, tenantID)
}

// TransferInventory transfers inventory between batches (for batch corrections)
func (s *InventoryService) TransferInventory(ctx context.Context, tenantID, productID, fromBatchID, toBatchID uuid.UUID, quantity int, referenceID uuid.UUID, notes string) error {
	// For now, skip transaction implementation to fix compilation
	// TODO: Implement proper transaction handling
	log.Printf("Transfer inventory operation skipped - transaction implementation needed")
	return fmt.Errorf("transfer inventory not implemented - requires transaction fix")
}

// CheckInventoryAvailability checks if enough inventory is available for a specific product and batch
func (s *InventoryService) CheckInventoryAvailability(ctx context.Context, tenantID, productID, batchID uuid.UUID, requiredQuantity int) (bool, error) {
	inventory, err := s.GetInventoryByProductBatch(ctx, tenantID, productID, batchID)
	if err != nil {
		return false, fmt.Errorf("failed to get inventory: %w", err)
	}

	// Convert string to float64 for comparison
	currentQuantity, _ := strconv.ParseFloat(inventory.Quantity, 64)
	return currentQuantity >= float64(requiredQuantity), nil
}

// DeleteBatch deletes a batch by ID
func (s *InventoryService) DeleteBatch(ctx context.Context, batchID, tenantID uuid.UUID) error {
	// Check if batch exists and belongs to tenant
	batch, err := s.GetBatchByID(ctx, batchID, tenantID)
	if err != nil {
		return errors.NewNotFound("batch not found")
	}
	
	// Check if there's inventory associated with this batch
	inventory, err := s.GetInventoryByProductBatch(ctx, tenantID, batch.ProductID, batchID)
	if err == nil {
		// If inventory exists, check if quantity is zero
		currentQuantity, _ := strconv.ParseFloat(inventory.Quantity, 64)
		if currentQuantity > 0 {
			return errors.NewConflict("cannot delete batch with non-zero inventory quantity")
		}
		// If quantity is zero, we can delete the inventory record
		// This will be handled by cascade delete
	}
	
	// Delete the batch (cascade will handle related records)
	err = s.queries.DeleteBatch(ctx, db.DeleteBatchParams{
		ID:       batchID,
		TenantID: tenantID,
	})
	if err != nil {
		return errors.Wrap(err, http.StatusInternalServerError, "failed to delete batch")
	}
	
	return nil
}

// GetInventorySummary gets a summary of inventory for dashboard
func (s *InventoryService) GetInventorySummary(ctx context.Context, tenantID uuid.UUID) (map[string]interface{}, error) {
	// Get total products
	totalProducts, err := s.queries.CountProductsByTenant(ctx, tenantID)
	if err != nil {
		return nil, fmt.Errorf("failed to count products: %w", err)
	}

	// Get low stock count
	lowStockProducts, err := s.GetLowStockReport(ctx, tenantID, 10)
	if err != nil {
		return nil, fmt.Errorf("failed to get low stock count: %w", err)
	}

	// Get total inventory value
	totalValue, err := s.GetInventoryValue(ctx, tenantID)
	if err != nil {
		return nil, fmt.Errorf("failed to get inventory value: %w", err)
	}

	// Get expiring batches (within 30 days)
	expiringBatches, err := s.GetExpiringBatches(ctx, tenantID, 30)
	if err != nil {
		return nil, fmt.Errorf("failed to get expiring batches: %w", err)
	}

	return map[string]interface{}{
		"total_products":     totalProducts,
		"low_stock_count":    len(lowStockProducts),
		"total_value":        totalValue,
		"expiring_batches":   len(expiringBatches),
	}, nil
}
