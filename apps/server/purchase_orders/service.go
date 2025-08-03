package purchase_orders

import (
	"context"
	"fmt"
	"time"

	"agromart2/db"
	"agromart2/internal/utils"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rs/zerolog/log"
)

type PurchaseOrderService struct {
	db *pgxpool.Pool
	q  *db.Queries
}

func NewPurchaseOrderService(db *pgxpool.Pool, queries *db.Queries) *PurchaseOrderService {
	return &PurchaseOrderService{
		db: db,
		q:  queries,
	}
}

type CreatePurchaseOrderParams struct {
	TenantID             uuid.UUID
	PONumber             string
	SupplierID           uuid.UUID
	LocationID           *uuid.UUID
	ExpectedDeliveryDate *time.Time
	TotalAmount          int
	TaxAmount            int
	DiscountAmount       int
	FinalAmount          int
	Notes                string
	CreatedBy            uuid.UUID
	Items                []CreatePurchaseOrderItemParams
}

type CreatePurchaseOrderItemParams struct {
	ProductID       uuid.UUID
	BatchID         *uuid.UUID
	QuantityOrdered int
	UnitCost        int
	TotalCost       int
	TaxPercent      int
	DiscountPercent int
	Notes           string
}

type UpdatePurchaseOrderStatusParams struct {
	ID         uuid.UUID
	TenantID   uuid.UUID
	Status     string
	ApprovedBy uuid.UUID
}

// CreatePurchaseOrder creates a new purchase order with items
func (s *PurchaseOrderService) CreatePurchaseOrder(ctx context.Context, params CreatePurchaseOrderParams) (db.PurchaseOrder, error) {
	// Start transaction
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return db.PurchaseOrder{}, fmt.Errorf("failed to start transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	qtx := s.q.WithTx(tx)

	// Create purchase order
	poArgs := db.CreatePurchaseOrderParams{
		TenantID:   params.TenantID,
		PoNumber:   params.PONumber,
		SupplierID: params.SupplierID,
		CreatedBy:  utils.P.UUID(params.CreatedBy),
	}

	if params.LocationID != nil {
		poArgs.LocationID = utils.P.UUID(*params.LocationID)
	}

	po, err := qtx.CreatePurchaseOrder(ctx, poArgs)
	if err != nil {
		log.Error().Err(err).Msg("failed to create purchase order")
		return db.PurchaseOrder{}, fmt.Errorf("failed to create purchase order: %w", err)
	}

	// Create purchase order items
	for _, item := range params.Items {
		itemArgs := db.CreatePurchaseOrderItemParams{
			TenantID:        params.TenantID,
			PurchaseOrderID: po.ID,
			ProductID:       item.ProductID,
			QuantityOrdered: utils.P.Numeric(item.QuantityOrdered),
			UnitCost:        utils.P.Numeric(item.UnitCost),
			TotalCost:       utils.P.Numeric(item.TotalCost),
		}

		_, err := qtx.CreatePurchaseOrderItem(ctx, itemArgs)
		if err != nil {
			log.Error().Err(err).Msg("failed to create purchase order item")
			return db.PurchaseOrder{}, fmt.Errorf("failed to create purchase order item: %w", err)
		}
	}

	// Commit transaction
	if err = tx.Commit(ctx); err != nil {
		return db.PurchaseOrder{}, fmt.Errorf("failed to commit transaction: %w", err)
	}

	return po, nil
}

// GetPurchaseOrder retrieves a purchase order by ID
func (s *PurchaseOrderService) GetPurchaseOrder(ctx context.Context, id, tenantID uuid.UUID) (db.PurchaseOrder, error) {
	args := db.GetPurchaseOrderParams{
		ID:       id,
		TenantID: tenantID,
	}

	po, err := s.q.GetPurchaseOrder(ctx, args)
	if err != nil {
		log.Error().Err(err).Msg("failed to get purchase order")
		return db.PurchaseOrder{}, fmt.Errorf("purchase order not found: %w", err)
	}

	return po, nil
}

// GetPurchaseOrderItems retrieves all items for a purchase order
func (s *PurchaseOrderService) GetPurchaseOrderItems(ctx context.Context, purchaseOrderID, tenantID uuid.UUID) ([]db.PurchaseOrderItem, error) {
	args := db.GetPurchaseOrderItemsParams{
		PurchaseOrderID: purchaseOrderID,
		TenantID:        tenantID,
	}

	items, err := s.q.GetPurchaseOrderItems(ctx, args)
	if err != nil {
		log.Error().Err(err).Msg("failed to get purchase order items")
		return []db.PurchaseOrderItem{}, fmt.Errorf("failed to get purchase order items: %w", err)
	}

	return items, nil
}

// UpdatePurchaseOrderStatus updates the status of a purchase order
func (s *PurchaseOrderService) UpdatePurchaseOrderStatus(ctx context.Context, params UpdatePurchaseOrderStatusParams) error {
	args := db.UpdatePurchaseOrderStatusParams{
		Status:     params.Status,
		ApprovedBy: utils.P.UUID(params.ApprovedBy),
		ID:         params.ID,
		TenantID:   params.TenantID,
	}

	err := s.q.UpdatePurchaseOrderStatus(ctx, args)
	if err != nil {
		log.Error().Err(err).Msg("failed to update purchase order status")
		return fmt.Errorf("failed to update purchase order status: %w", err)
	}

	return nil
}

// ListPurchaseOrdersByStatus lists purchase orders by status
func (s *PurchaseOrderService) ListPurchaseOrdersByStatus(ctx context.Context, tenantID uuid.UUID, status string, limit, offset int32) ([]db.PurchaseOrder, error) {
	args := db.ListPurchaseOrdersByStatusParams{
		TenantID: tenantID,
		Status:   status,
		Limit:    limit,
		Offset:   offset,
	}

	orders, err := s.q.ListPurchaseOrdersByStatus(ctx, args)
	if err != nil {
		log.Error().Err(err).Msg("failed to list purchase orders by status")
		return []db.PurchaseOrder{}, fmt.Errorf("failed to list purchase orders: %w", err)
	}

	return orders, nil
}

// ListPurchaseOrdersBySupplier lists purchase orders by supplier
func (s *PurchaseOrderService) ListPurchaseOrdersBySupplier(ctx context.Context, tenantID, supplierID uuid.UUID, limit, offset int32) ([]db.PurchaseOrder, error) {
	args := db.ListPurchaseOrdersBySupplierParams{
		TenantID:   tenantID,
		SupplierID: supplierID,
		Limit:      limit,
		Offset:     offset,
	}

	orders, err := s.q.ListPurchaseOrdersBySupplier(ctx, args)
	if err != nil {
		log.Error().Err(err).Msg("failed to list purchase orders by supplier")
		return []db.PurchaseOrder{}, fmt.Errorf("failed to list purchase orders: %w", err)
	}

	return orders, nil
}

// UpdatePurchaseOrderItemQuantityReceived updates the received quantity for a purchase order item
func (s *PurchaseOrderService) UpdatePurchaseOrderItemQuantityReceived(ctx context.Context, itemID, tenantID uuid.UUID, quantityReceived int) (db.PurchaseOrderItem, error) {
	args := db.UpdatePurchaseOrderItemQuantityReceivedParams{
		ID:               itemID,
		QuantityReceived: utils.P.Numeric(quantityReceived),
		TenantID:         tenantID,
	}

	item, err := s.q.UpdatePurchaseOrderItemQuantityReceived(ctx, args)
	if err != nil {
		log.Error().Err(err).Msg("failed to update purchase order item quantity received")
		return db.PurchaseOrderItem{}, fmt.Errorf("failed to update quantity received: %w", err)
	}

	return item, nil
}

// GetPurchaseOrderItemByID retrieves a purchase order item by ID
func (s *PurchaseOrderService) GetPurchaseOrderItemByID(ctx context.Context, itemID, tenantID uuid.UUID) (db.PurchaseOrderItem, error) {
	args := db.GetPurchaseOrderItemByIDParams{
		ID:       itemID,
		TenantID: tenantID,
	}

	item, err := s.q.GetPurchaseOrderItemByID(ctx, args)
	if err != nil {
		log.Error().Err(err).Msg("failed to get purchase order item")
		return db.PurchaseOrderItem{}, fmt.Errorf("purchase order item not found: %w", err)
	}

	return item, nil
}

// GetProductMovementReport gets product movement report
func (s *PurchaseOrderService) GetProductMovementReport(ctx context.Context, tenantID uuid.UUID) ([]db.GetProductMovementReportRow, error) {
	report, err := s.q.GetProductMovementReport(ctx, tenantID)
	if err != nil {
		log.Error().Err(err).Msg("failed to get product movement report")
		return []db.GetProductMovementReportRow{}, fmt.Errorf("failed to get product movement report: %w", err)
	}

	return report, nil
}

// GetSupplierPurchaseSummary gets supplier purchase summary
func (s *PurchaseOrderService) GetSupplierPurchaseSummary(ctx context.Context, tenantID uuid.UUID) ([]db.GetSupplierPurchaseSummaryRow, error) {
	summary, err := s.q.GetSupplierPurchaseSummary(ctx, tenantID)
	if err != nil {
		log.Error().Err(err).Msg("failed to get supplier purchase summary")
		return []db.GetSupplierPurchaseSummaryRow{}, fmt.Errorf("failed to get supplier purchase summary: %w", err)
	}

	return summary, nil
}

// ReceivePurchaseOrder processes receiving of a purchase order and updates inventory
func (s *PurchaseOrderService) ReceivePurchaseOrder(ctx context.Context, purchaseOrderID, tenantID, userID uuid.UUID, items []ReceiveItemParams) error {
	// Start transaction
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("failed to start transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	qtx := s.q.WithTx(tx)

	// Update each item's received quantity
	for _, item := range items {
		// Update purchase order item
		_, err := qtx.UpdatePurchaseOrderItemQuantityReceived(ctx, db.UpdatePurchaseOrderItemQuantityReceivedParams{
			ID:               item.ItemID,
			QuantityReceived: utils.P.Numeric(item.QuantityReceived),
			TenantID:         tenantID,
		})
		if err != nil {
			return fmt.Errorf("failed to update item quantity received: %w", err)
		}

		// Add to inventory if batch ID is provided
		if item.BatchID != nil {
			err = qtx.AddInventoryQuantity(ctx, db.AddInventoryQuantityParams{
				TenantID:  tenantID,
				ProductID: item.ProductID,
				BatchID:   *item.BatchID,
				Quantity:  utils.P.Numeric(item.QuantityReceived),
			})
			if err != nil {
				return fmt.Errorf("failed to add inventory: %w", err)
			}

			// Log inventory change
			err = qtx.CreateInventoryLog(ctx, db.CreateInventoryLogParams{
				TenantID:        tenantID,
				ProductID:       item.ProductID,
				BatchID:         *item.BatchID,
				TransactionType: "PURCHASE_RECEIVE",
				QuantityChange:  utils.P.Numeric(item.QuantityReceived),
				ReferenceID:     utils.P.UUID(purchaseOrderID),
				Notes:           utils.P.Text(fmt.Sprintf("Received from PO: %s", purchaseOrderID)),
			})
			if err != nil {
				return fmt.Errorf("failed to log inventory change: %w", err)
			}
		}
	}

	// Update purchase order status to RECEIVED
	err = qtx.UpdatePurchaseOrderStatus(ctx, db.UpdatePurchaseOrderStatusParams{
		Status:     "RECEIVED",
		ApprovedBy: utils.P.UUID(userID),
		ID:         purchaseOrderID,
		TenantID:   tenantID,
	})
	if err != nil {
		return fmt.Errorf("failed to update purchase order status: %w", err)
	}

	// Commit transaction
	if err = tx.Commit(ctx); err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	return nil
}

type ReceiveItemParams struct {
	ItemID           uuid.UUID
	ProductID        uuid.UUID
	BatchID          *uuid.UUID
	QuantityReceived int
}
