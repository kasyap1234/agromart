package batches

import (
	"context"
	"strconv"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"agromart2/db"
)

type Service struct {
	db *pgxpool.Pool
	q  *db.Queries
}

func NewService(db *pgxpool.Pool, query *db.Queries) *Service {
	return &Service{
		db: db,
		q:  query,
	}
}

// CreateBatch creates a new batch
func (s *Service) CreateBatch(ctx context.Context, tenantID uuid.UUID, productID uuid.UUID, batchNumber string, expiryDate time.Time, cost int) (db.Batch, error) {
	args := db.CreateBatchParams{
		TenantID:    tenantID,
		ProductID:   productID,
		BatchNumber: batchNumber,
		ExpiryDate:  expiryDate,
		Cost:        strconv.Itoa(cost),
	}
	
	batch, err := s.q.CreateBatch(ctx, args)
	if err != nil {
		return db.Batch{}, err
	}
	
	return batch, nil
}

// GetBatchByID retrieves a batch by ID
func (s *Service) GetBatchByID(ctx context.Context, batchID uuid.UUID, tenantID uuid.UUID) (db.Batch, error) {
	args := db.GetBatchByIDParams{
		ID:       batchID,
		TenantID: tenantID,
	}
	
	batch, err := s.q.GetBatchByID(ctx, args)
	if err != nil {
		return db.Batch{}, err
	}
	
	return batch, nil
}

// UpdateBatch updates a batch
func (s *Service) UpdateBatch(ctx context.Context, tenantID uuid.UUID, batchID uuid.UUID, batchNumber string, expiryDate time.Time, cost int) (db.Batch, error) {
	args := db.UpdateBatchParams{
		ID:          batchID,
		TenantID:    tenantID,
		BatchNumber: batchNumber,
		ExpiryDate:  expiryDate,
		Cost:        strconv.Itoa(cost),
	}
	
	batch, err := s.q.UpdateBatch(ctx, args)
	if err != nil {
		return db.Batch{}, err
	}
	
	return batch, nil
}

// ListBatches lists batches with pagination
func (s *Service) ListBatches(ctx context.Context, tenantID uuid.UUID, limit, offset int32) ([]db.Batch, error) {
	args := db.ListBatchesParams{
		TenantID: tenantID,
		Limit:    limit,
		Offset:   offset,
	}
	
	batches, err := s.q.ListBatches(ctx, args)
	if err != nil {
		return []db.Batch{}, err
	}
	
	return batches, nil
}