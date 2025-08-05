package analytics

import (
	"context"
	"math/big"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	"agromart2/db"
)

type Service struct {
	db      *pgxpool.Pool
	queries *db.Queries
}

func NewService(dbpool *pgxpool.Pool, q *db.Queries) *Service {
	return &Service{db: dbpool, queries: q}
}

// KPI bundle

type KPIParams struct {
	TenantID  uuid.UUID
	FromDate  time.Time
	ToDate    time.Time
	Threshold int32
	TopN      int32
	WindowEnd time.Time // for expiring batches count upper bound date
}

type TopProduct struct {
	ProductID   uuid.UUID `json:"product_id"`
	ProductName string    `json:"product_name"`
	ProductSKU  string    `json:"product_sku"`
	Revenue     int64     `json:"revenue"`
}

type KPIs struct {
	InventoryValue          int64        `json:"inventory_value"`
	StockoutRiskCount       int64        `json:"stockout_risk_count"`
	OpenSalesOrdersCount    int64        `json:"open_sales_orders_count"`
	OpenPurchaseOrdersCount int64        `json:"open_purchase_orders_count"`
	RevenueInPeriod         int64        `json:"revenue_in_period"`
	TopProductsByRevenue    []TopProduct `json:"top_products_by_revenue"`
	ExpiringBatchesCount    int64        `json:"expiring_batches_count"`
	FromDate                time.Time    `json:"from_date"`
	ToDate                  time.Time    `json:"to_date"`
}

func (s *Service) GetKPIs(ctx context.Context, p KPIParams) (*KPIs, error) {
	// Inventory value
	var invVal int64
	{
		vAny, err := s.queries.GetInventoryValue(ctx, p.TenantID)
		if err != nil {
			return nil, err
		}
		invVal = toInt64(vAny)
	}

	// Stockout risk count (threshold numeric)
	stockoutAny, err := s.queries.GetStockoutRiskCount(ctx, db.GetStockoutRiskCountParams{
		TenantID: p.TenantID,
		// Build a pgtype.Numeric integer with scale 0 using available fields in our pgtype.Numeric
		Quantity: numericFromInt64(int64(p.Threshold)),
	})
	if err != nil {
		return nil, err
	}
	stockout := toInt64(stockoutAny)

	// Open SO/PO counts (use OrderDate fields)
	soOpen, err := s.queries.CountOpenSalesOrders(ctx, db.CountOpenSalesOrdersParams{
		TenantID:  p.TenantID,
		OrderDate: p.FromDate,   // $2
		// $3
		OrderDate_2: p.ToDate,
	})
	if err != nil {
		return nil, err
	}
	poOpen, err := s.queries.CountOpenPurchaseOrders(ctx, db.CountOpenPurchaseOrdersParams{
		TenantID:    p.TenantID,
		OrderDate:   p.FromDate, // $2
		OrderDate_2: p.ToDate,   // $3
	})
	if err != nil {
		return nil, err
	}

	// Revenue in period (returns interface{})
	revenueAny, err := s.queries.GetRevenueInPeriod(ctx, db.GetRevenueInPeriodParams{
		TenantID:    p.TenantID,
		OrderDate:   p.FromDate,
		OrderDate_2: p.ToDate,
	})
	if err != nil {
		return nil, err
	}
	revenue := toInt64(revenueAny)

	// Top products by revenue
	topRows, err := s.queries.GetTopProductsByRevenue(ctx, db.GetTopProductsByRevenueParams{
		TenantID:    p.TenantID,
		OrderDate:   p.FromDate,
		OrderDate_2: p.ToDate,
		Limit:       int32(p.TopN),
	})
	if err != nil {
		return nil, err
	}
	top := make([]TopProduct, 0, len(topRows))
	for _, r := range topRows {
		top = append(top, TopProduct{
			ProductID:   r.ProductID,
			ProductName: r.ProductName,
			ProductSKU:  r.ProductSku,
			Revenue:     r.Revenue,
		})
	}

	// Expiring batches within window (Column2 is the upper bound date)
	expAny, err := s.queries.CountExpiringBatchesWithinDays(ctx, db.CountExpiringBatchesWithinDaysParams{
		TenantID: p.TenantID,
		Column2:  p.WindowEnd,
	})
	if err != nil {
		return nil, err
	}
	expCount := toInt64(expAny)

	return &KPIs{
		InventoryValue:          invVal,
		StockoutRiskCount:       stockout,
		OpenSalesOrdersCount:    soOpen,
		OpenPurchaseOrdersCount: poOpen,
		RevenueInPeriod:         revenue,
		TopProductsByRevenue:    top,
		ExpiringBatchesCount:    expCount,
		FromDate:                p.FromDate,
		ToDate:                  p.ToDate,
	}, nil
}

// Time series

type SeriesParams struct {
	TenantID uuid.UUID
	FromDate time.Time
	ToDate   time.Time
	Group    string // "day" or "month"
}

type SeriesPoint struct {
	Period time.Time `json:"period"`
	Value  int64     `json:"value"`
}

func (s *Service) GetSalesSeries(ctx context.Context, p SeriesParams) ([]SeriesPoint, error) {
	rows, err := s.queries.GetSalesTimeSeries(ctx, db.GetSalesTimeSeriesParams{
		Grp:      p.Group,
		TenantID: p.TenantID,
		FromDate: p.FromDate,
		ToDate:   p.ToDate,
	})
	if err != nil {
		return nil, err
	}
	out := make([]SeriesPoint, 0, len(rows))
	for _, r := range rows {
		out = append(out, SeriesPoint{
			Period: intervalToBucketStart(r.Period, p.Group, p.FromDate),
			Value:  toInt64(r.Revenue),
		})
	}
	return out, nil
}

func (s *Service) GetPurchasesSeries(ctx context.Context, p SeriesParams) ([]SeriesPoint, error) {
	rows, err := s.queries.GetPurchasesTimeSeries(ctx, db.GetPurchasesTimeSeriesParams{
		Grp:      p.Group,
		TenantID: p.TenantID,
		FromDate: p.FromDate,
		ToDate:   p.ToDate,
	})
	if err != nil {
		return nil, err
	}
	out := make([]SeriesPoint, 0, len(rows))
	for _, r := range rows {
		out = append(out, SeriesPoint{
			Period: intervalToBucketStart(r.Period, p.Group, p.FromDate),
			Value:  toInt64(r.TotalCost),
		})
	}
	return out, nil
}

func numericFromInt64(n int64) pgtype.Numeric {
	// Construct Numeric representing integer n with scale 0
	return pgtype.Numeric{
		Int:   big.NewInt(n), // *big.Int
		Exp:   0,             // scale 0
		Valid: true,
	}
}

// helpers

func toInt64(v interface{}) int64 {
	switch t := v.(type) {
	case int64:
		return t
	case int32:
		return int64(t)
	case float64:
		return int64(t)
	case float32:
		return int64(t)
	case pgtype.Int8:
		if t.Valid {
			return t.Int64
		}
	case pgtype.Numeric:
		// Handle numeric as integer when scale (Exp) is 0
		if t.Valid && t.Exp == 0 && t.Int != nil && t.Int.IsInt64() {
			return t.Int.Int64()
		}
	}
	return 0
}


// intervalToBucketStart best-effort conversion: since sqlc mapped date_trunc to pgtype.Interval,
// reconstruct a bucket start from the provided fromDate and the interval.
// If mapping is undesirable, prefer changing SQL to cast date_trunc(... )::timestamp.
func intervalToBucketStart(iv pgtype.Interval, grp string, fromDate time.Time) time.Time {
	// Fallback: if interval invalid, return fromDate
	if !iv.Valid {
		return fromDate
	}
	// Approximate: add months, days, microseconds to fromDate
	t := fromDate
	// Months: treat as calendar months
	if iv.Months != 0 {
		t = t.AddDate(0, int(iv.Months), 0)
	}
	// Days
	if iv.Days != 0 {
		t = t.AddDate(0, 0, int(iv.Days))
	}
	// Microseconds
	if iv.Microseconds != 0 {
		t = t.Add(time.Duration(iv.Microseconds) * time.Microsecond)
	}
	// Normalize to bucket floor
	if grp == "month" {
		return time.Date(t.Year(), t.Month(), 1, 0, 0, 0, 0, time.UTC)
	}
	return time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, time.UTC)
}