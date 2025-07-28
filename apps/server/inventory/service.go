package inventory

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/kasyap1234/agromart/models"
	"github.com/kasyap1234/agromart/repositories"
	"github.com/shopspring/decimal"
	"gorm.io/gorm"
)

type InventoryService struct {
	db   *gorm.DB
	repo *repositories.InventoryRepository
}

func NewService(db *gorm.DB, repo *repositories.InventoryRepository) *InventoryService {
	return &InventoryService{
		db:   db,
		repo: repo,
	}
}

func (s *InventoryService) AddInventoryQuantity(ctx context.Context, tenantID, productID, batchID uuid.UUID, quantity int) error {
	quantityDecimal := decimal.NewFromInt(int64(quantity))
	notes := "Stock added"
	return s.repo.AddStock(ctx, tenantID, productID, batchID, quantityDecimal, notes, nil)
}

func (s *InventoryService) CreateBatch(ctx context.Context, tenantID, productID uuid.UUID, batchNumber string, expiryDate time.Time, cost int) (*models.Batch, error) {
	batch := &models.Batch{
		TenantID:    tenantID,
		ProductID:   productID,
		BatchNumber: batchNumber,
		ExpiryDate:  &expiryDate,
		Cost:        decimal.NewFromInt(int64(cost)),
	}
	
	err := s.repo.CreateBatch(ctx, batch)
	if err != nil {
		return nil, err
	}
	return batch, nil
}

func (s *InventoryService) GetBatchByID(ctx context.Context, id, tenantID uuid.UUID) (*models.Batch, error) {
	return s.repo.GetBatchByID(ctx, id, tenantID)
}

func (s *InventoryService) GetInventoryByProductBatch(ctx context.Context, tenantID, productID, batchID uuid.UUID) (*models.Inventory, error) {
	return s.repo.GetInventoryByProductAndBatch(ctx, productID, batchID, tenantID)
}

func (s *InventoryService) ListAllInventory(ctx context.Context, tenantID uuid.UUID, limit, offset int) ([]models.Inventory, error) {
	return s.repo.GetInventoryByTenant(ctx, tenantID, limit, offset)
}

func (s *InventoryService) ReduceInventoryQuantity(ctx context.Context, tenantID, productID, batchID uuid.UUID, quantity int) error {
	quantityDecimal := decimal.NewFromInt(int64(quantity))
	notes := "Stock reduced"
	return s.repo.RemoveStock(ctx, tenantID, productID, batchID, quantityDecimal, notes, nil)
}

func (s *InventoryService) SetInventoryQuantity(ctx context.Context, tenantID, productID, batchID uuid.UUID, quantity int) error {
	inventory, err := s.repo.GetInventoryByProductAndBatch(ctx, productID, batchID, tenantID)
	if err != nil {
		return err
	}
	
	newQuantity := decimal.NewFromInt(int64(quantity))
	return s.repo.UpdateInventoryQuantity(ctx, inventory.ID, newQuantity)
}

func (s *InventoryService) UpdateBatch(ctx context.Context, id, tenantID uuid.UUID, batchNumber string, expiryDate time.Time, cost int) (*models.Batch, error) {
	batch, err := s.repo.GetBatchByID(ctx, id, tenantID)
	if err != nil {
		return nil, err
	}
	
	batch.BatchNumber = batchNumber
	batch.ExpiryDate = &expiryDate
	batch.Cost = decimal.NewFromInt(int64(cost))
	
	err = s.db.WithContext(ctx).Save(batch).Error
	if err != nil {
		return nil, err
	}
	
	return batch, nil
}

func (s *InventoryService) GetLowStockReport(ctx context.Context, tenantID uuid.UUID, threshold int) ([]models.Inventory, error) {
	thresholdDecimal := decimal.NewFromInt(int64(threshold))
	return s.repo.GetLowStockItems(ctx, tenantID, thresholdDecimal)
}

func (s *InventoryService) GetInventoryLogs(ctx context.Context, tenantID uuid.UUID, productID *uuid.UUID, limit, offset int) ([]models.InventoryLog, error) {
	return s.repo.GetInventoryLogs(ctx, tenantID, productID, limit, offset)
}

func (s *InventoryService) CreateInventoryLog(ctx context.Context, tenantID, productID, batchID uuid.UUID, referenceID *uuid.UUID, transactionType string, quantityChange int, notes string) error {
	log := &models.InventoryLog{
		TenantID:        tenantID,
		ProductID:       productID,
		BatchID:         batchID,
		TransactionType: transactionType,
		QuantityChange:  decimal.NewFromInt(int64(quantityChange)),
		Notes:           &notes,
		ReferenceID:     referenceID,
	}
	
	return s.repo.CreateInventoryLog(ctx, log)
}

func (s *InventoryService) GetInventoryValue(ctx context.Context, tenantID uuid.UUID) (decimal.Decimal, error) {
	return s.repo.GetInventoryValueByTenant(ctx, tenantID)
}

func (s *InventoryService) GetTopMovingProducts(ctx context.Context, tenantID uuid.UUID, days int, limit int) ([]map[string]interface{}, error) {
	return s.repo.GetTopMovingProducts(ctx, tenantID, days, limit)
}
