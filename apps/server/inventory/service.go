package inventory

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/kasyap1234/agromart/db"
	"github.com/kasyap1234/agromart/internal/utils"
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
		TenantID:  utils.UUIDToPgUUID(tenantID),
		ProductID: utils.UUIDToPgUUID(productID),
		BatchID:   utils.UUIDToPgUUID(batchID),
		Quantity:  utils.IntToPgNumeric(quantity),
	}
	err := s.queries.AddInventoryQuantity(ctx, args)

	return err
}

func (s *InventoryService) CreateBatch(ctx context.Context, tenantID, productID uuid.UUID, batchNumber string, expiryDate time.Time, cost int) (db.Batch, error) {
	args := db.CreateBatchParams{
		TenantID:    utils.UUIDToPgUUID(tenantID),
		ProductID:   utils.UUIDToPgUUID(productID),
		BatchNumber: batchNumber,
		ExpiryDate:  utils.TimeToPgDate(expiryDate),
		Cost:        utils.IntToPgNumeric(cost),
	}
	batch, err := s.queries.CreateBatch(ctx, args)
	return batch, err
}

func (s *InventoryService) GetBatchByID(ctx context.Context, id, tenantID uuid.UUID) (db.Batch, error) {
	args := db.GetBatchByIDParams{
		ID:       utils.UUIDToPgUUID(id),
		TenantID: utils.UUIDToPgUUID(tenantID),
	}
	return s.queries.GetBatchByID(ctx, args)
}

func (s *InventoryService) GetInventoryByProductBatch(ctx context.Context, tenantID, productID, batchID uuid.UUID) (db.Inventory, error) {
	args := db.GetInventoryByProductBatchParams{
		TenantID:  utils.UUIDToPgUUID(tenantID),
		ProductID: utils.UUIDToPgUUID(productID),
		BatchID:   utils.UUIDToPgUUID(batchID),
	}
	return s.queries.GetInventoryByProductBatch(ctx, args)
}

func (s *InventoryService) GetProductQuantity(ctx context.Context, tenantID, productID uuid.UUID) (interface{}, error) {
	args := db.GetProductQuantityParams{
		TenantID:  utils.UUIDToPgUUID(tenantID),
		ProductID: utils.UUIDToPgUUID(productID),
	}
	return s.queries.GetProductQuantity(ctx, args)
}

func (s *InventoryService) ListAllInventory(ctx context.Context, tenantID uuid.UUID, limit, offset int32) ([]db.ListAllInventoryRow, error) {
	args := db.ListAllInventoryParams{
		TenantID: utils.UUIDToPgUUID(tenantID),
		Limit:    limit,
		Offset:   offset,
	}
	return s.queries.ListAllInventory(ctx, args)
}

func (s *InventoryService) ReduceInventoryQuantity(ctx context.Context, tenantID, productID, batchID uuid.UUID, quantity int) error {
	args := db.ReduceInventoryQuantityParams{
		Quantity:  utils.IntToPgNumeric(quantity),
		TenantID:  utils.UUIDToPgUUID(tenantID),
		ProductID: utils.UUIDToPgUUID(productID),
		BatchID:   utils.UUIDToPgUUID(batchID),
	}
	return s.queries.ReduceInventoryQuantity(ctx, args)
}

func (s *InventoryService) SetInventoryQuantity(ctx context.Context, tenantID, productID, batchID uuid.UUID, quantity int) error {
	args := db.SetInventoryQuantityParams{
		Quantity:  utils.IntToPgNumeric(quantity),
		TenantID:  utils.UUIDToPgUUID(tenantID),
		ProductID: utils.UUIDToPgUUID(productID),
		BatchID:   utils.UUIDToPgUUID(batchID),
	}
	return s.queries.SetInventoryQuantity(ctx, args)
}

func (s *InventoryService) UpdateBatch(ctx context.Context, id, tenantID uuid.UUID, batchNumber string, expiryDate time.Time, cost int) (db.Batch, error) {
	args := db.UpdateBatchParams{
		ID:          utils.UUIDToPgUUID(id),
		BatchNumber: batchNumber,
		ExpiryDate:  utils.TimeToPgDate(expiryDate),
		Cost:        utils.IntToPgNumeric(cost),
		TenantID:    utils.UUIDToPgUUID(tenantID),
	}
	return s.queries.UpdateBatch(ctx, args)
}

func (s *InventoryService) GetProductInventoryDetails(ctx context.Context, tenantID, productID uuid.UUID) ([]db.GetProductInventoryDetailsRow, error) {
	args := db.GetProductInventoryDetailsParams{
		TenantID:  utils.UUIDToPgUUID(tenantID),
		ProductID: utils.UUIDToPgUUID(productID),
	}
	return s.queries.GetProductInventoryDetails(ctx, args)
}

func (s *InventoryService) GetLowStockReport(ctx context.Context, tenantID uuid.UUID, threshold int) ([]db.GetLowStockReportRow, error) {
	args := db.GetLowStockReportParams{
		TenantID: utils.UUIDToPgUUID(tenantID),
		Quantity: utils.IntToPgNumeric(threshold),
	}
	return s.queries.GetLowStockReport(ctx, args)
}

func (s *InventoryService) GetInventoryLogByProduct(ctx context.Context, tenantID, productID uuid.UUID, limit, offset int32) ([]db.InventoryLog, error) {
	args := db.GetInventoryLogByProductParams{
		TenantID:  utils.UUIDToPgUUID(tenantID),
		ProductID: utils.UUIDToPgUUID(productID),
		Limit:     limit,
		Offset:    offset,
	}
	return s.queries.GetInventoryLogByProduct(ctx, args)
}

func (s *InventoryService) GetInventoryLogByBatch(ctx context.Context, tenantID, batchID uuid.UUID, limit, offset int32) ([]db.InventoryLog, error) {
	args := db.GetInventoryLogByBatchParams{
		TenantID: utils.UUIDToPgUUID(tenantID),
		BatchID:  utils.UUIDToPgUUID(batchID),
		Limit:    limit,
		Offset:   offset,
	}
	return s.queries.GetInventoryLogByBatch(ctx, args)
}

func (s *InventoryService) CreateInventoryLog(ctx context.Context, tenantID, productID, batchID, referenceID uuid.UUID, transactionType string, quantityChange int, notes string) error {
	args := db.CreateInventoryLogParams{
		TenantID:        utils.UUIDToPgUUID(tenantID),
		ProductID:       utils.UUIDToPgUUID(productID),
		BatchID:         utils.UUIDToPgUUID(batchID),
		TransactionType: transactionType,
		QuantityChange:  utils.IntToPgNumeric(quantityChange),
		ReferenceID:     utils.UUIDToPgUUID(referenceID),
		Notes:           utils.StringToPgText(notes),
	}
	return s.queries.CreateInventoryLog(ctx, args)
}
