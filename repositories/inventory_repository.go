package repositories

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/kasyap1234/agromart/models"
	"github.com/shopspring/decimal"
	"gorm.io/gorm"
)

type InventoryRepository struct {
	db *gorm.DB
}

func NewInventoryRepository(db *gorm.DB) *InventoryRepository {
	return &InventoryRepository{db: db}
}

// Batch operations
func (r *InventoryRepository) CreateBatch(ctx context.Context, batch *models.Batch) error {
	return r.db.WithContext(ctx).Create(batch).Error
}

func (r *InventoryRepository) GetBatchByID(ctx context.Context, batchID, tenantID uuid.UUID) (*models.Batch, error) {
	var batch models.Batch
	err := r.db.WithContext(ctx).
		Where("id = ? AND tenant_id = ?", batchID, tenantID).
		First(&batch).Error
	if err != nil {
		return nil, err
	}
	return &batch, nil
}

func (r *InventoryRepository) ListBatches(ctx context.Context, tenantID uuid.UUID, productID *uuid.UUID, limit, offset int) ([]models.Batch, error) {
	var batches []models.Batch
	query := r.db.WithContext(ctx).Where("tenant_id = ?", tenantID)
	
	if productID != nil {
		query = query.Where("product_id = ?", *productID)
	}
	
	err := query.Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&batches).Error
	return batches, err
}

// Inventory operations
func (r *InventoryRepository) GetInventoryByProductAndBatch(ctx context.Context, productID, batchID, tenantID uuid.UUID) (*models.Inventory, error) {
	var inventory models.Inventory
	err := r.db.WithContext(ctx).
		Where("product_id = ? AND batch_id = ? AND tenant_id = ?", productID, batchID, tenantID).
		First(&inventory).Error
	if err != nil {
		return nil, err
	}
	return &inventory, nil
}

func (r *InventoryRepository) UpdateInventoryQuantity(ctx context.Context, inventoryID uuid.UUID, quantity decimal.Decimal) error {
	return r.db.WithContext(ctx).Model(&models.Inventory{}).
		Where("id = ?", inventoryID).
		Update("quantity", quantity).Error
}

func (r *InventoryRepository) GetInventoryByTenant(ctx context.Context, tenantID uuid.UUID, limit, offset int) ([]models.Inventory, error) {
	var inventory []models.Inventory
	err := r.db.WithContext(ctx).
		Preload("Product").
		Preload("Batch").
		Where("tenant_id = ?", tenantID).
		Limit(limit).
		Offset(offset).
		Find(&inventory).Error
	return inventory, err
}

func (r *InventoryRepository) GetLowStockItems(ctx context.Context, tenantID uuid.UUID, threshold decimal.Decimal) ([]models.Inventory, error) {
	var inventory []models.Inventory
	err := r.db.WithContext(ctx).
		Preload("Product").
		Preload("Batch").
		Where("tenant_id = ? AND quantity <= ?", tenantID, threshold).
		Find(&inventory).Error
	return inventory, err
}

// Inventory log operations
func (r *InventoryRepository) CreateInventoryLog(ctx context.Context, log *models.InventoryLog) error {
	return r.db.WithContext(ctx).Create(log).Error
}

func (r *InventoryRepository) GetInventoryLogs(ctx context.Context, tenantID uuid.UUID, productID *uuid.UUID, limit, offset int) ([]models.InventoryLog, error) {
	var logs []models.InventoryLog
	query := r.db.WithContext(ctx).Where("tenant_id = ?", tenantID)
	
	if productID != nil {
		query = query.Where("product_id = ?", *productID)
	}
	
	err := query.Order("transaction_date DESC").
		Limit(limit).
		Offset(offset).
		Find(&logs).Error
	return logs, err
}

// Helper functions for inventory movements
func (r *InventoryRepository) AddStock(ctx context.Context, tenantID, productID, batchID uuid.UUID, quantity decimal.Decimal, notes string, referenceID *uuid.UUID) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Update or create inventory record
		var inventory models.Inventory
		err := tx.Where("tenant_id = ? AND product_id = ? AND batch_id = ?", tenantID, productID, batchID).
			First(&inventory).Error
		
		if err == gorm.ErrRecordNotFound {
			// Create new inventory record
			inventory = models.Inventory{
				TenantID:  tenantID,
				ProductID: productID,
				BatchID:   batchID,
				Quantity:  quantity,
			}
			if err := tx.Create(&inventory).Error; err != nil {
				return err
			}
		} else if err != nil {
			return err
		} else {
			// Update existing inventory
			inventory.Quantity = inventory.Quantity.Add(quantity)
			if err := tx.Save(&inventory).Error; err != nil {
				return err
			}
		}

		// Create inventory log
		log := &models.InventoryLog{
			TenantID:        tenantID,
			ProductID:       productID,
			BatchID:         batchID,
			TransactionType: "IN",
			QuantityChange:  quantity,
			TransactionDate: time.Now(),
			Notes:           &notes,
			ReferenceID:     referenceID,
		}
		return tx.Create(log).Error
	})
}

func (r *InventoryRepository) RemoveStock(ctx context.Context, tenantID, productID, batchID uuid.UUID, quantity decimal.Decimal, notes string, referenceID *uuid.UUID) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Get current inventory
		var inventory models.Inventory
		err := tx.Where("tenant_id = ? AND product_id = ? AND batch_id = ?", tenantID, productID, batchID).
			First(&inventory).Error
		if err != nil {
			return err
		}

		// Check if sufficient stock
		if inventory.Quantity.LessThan(quantity) {
			return gorm.ErrInvalidData // or custom insufficient stock error
		}

		// Update inventory
		inventory.Quantity = inventory.Quantity.Sub(quantity)
		if err := tx.Save(&inventory).Error; err != nil {
			return err
		}

		// Create inventory log
		log := &models.InventoryLog{
			TenantID:        tenantID,
			ProductID:       productID,
			BatchID:         batchID,
			TransactionType: "OUT",
			QuantityChange:  quantity.Neg(),
			TransactionDate: time.Now(),
			Notes:           &notes,
			ReferenceID:     referenceID,
		}
		return tx.Create(log).Error
	})
}

// Analytics and reports
func (r *InventoryRepository) GetInventoryValueByTenant(ctx context.Context, tenantID uuid.UUID) (decimal.Decimal, error) {
	var total decimal.Decimal
	err := r.db.WithContext(ctx).Model(&models.Inventory{}).
		Select("COALESCE(SUM(inventory.quantity * batches.cost), 0)").
		Joins("JOIN batches ON inventory.batch_id = batches.id").
		Where("inventory.tenant_id = ?", tenantID).
		Scan(&total).Error
	return total, err
}

func (r *InventoryRepository) GetTopMovingProducts(ctx context.Context, tenantID uuid.UUID, days int, limit int) ([]map[string]interface{}, error) {
	var results []map[string]interface{}
	
	query := `
		SELECT 
			p.id,
			p.name,
			p.sku,
			SUM(ABS(il.quantity_change)) as total_movement
		FROM products p
		JOIN inventory_logs il ON p.id = il.product_id
		WHERE p.tenant_id = ? 
			AND il.transaction_date >= NOW() - INTERVAL '%d days'
		GROUP BY p.id, p.name, p.sku
		ORDER BY total_movement DESC
		LIMIT ?
	`
	
	err := r.db.WithContext(ctx).Raw(query, tenantID, days, limit).Scan(&results).Error
	return results, err
}
