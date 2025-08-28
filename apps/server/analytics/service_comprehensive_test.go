package analytics

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	"agromart2/db"
)

// MockAnalyticsQuerier implements the AnalyticsQuerier interface for testing
type MockAnalyticsQuerier struct {
	mock.Mock
}

// Implement all the AnalyticsQuerier interface methods
func (m *MockAnalyticsQuerier) GetInventoryValue(ctx context.Context, tenantID uuid.UUID) (interface{}, error) {
	args := m.Called(ctx, tenantID)
	return args.Get(0), args.Error(1)
}

func (m *MockAnalyticsQuerier) GetStockoutRiskCount(ctx context.Context, params db.GetStockoutRiskCountParams) (interface{}, error) {
	args := m.Called(ctx, params)
	return args.Get(0), args.Error(1)
}

func (m *MockAnalyticsQuerier) CountOpenSalesOrders(ctx context.Context, params db.CountOpenSalesOrdersParams) (int64, error) {
	args := m.Called(ctx, params)
	return args.Get(0).(int64), args.Error(1)
}

func (m *MockAnalyticsQuerier) CountOpenPurchaseOrders(ctx context.Context, params db.CountOpenPurchaseOrdersParams) (int64, error) {
	args := m.Called(ctx, params)
	return args.Get(0).(int64), args.Error(1)
}

func (m *MockAnalyticsQuerier) GetRevenueInPeriod(ctx context.Context, params db.GetRevenueInPeriodParams) (interface{}, error) {
	args := m.Called(ctx, params)
	return args.Get(0), args.Error(1)
}

func (m *MockAnalyticsQuerier) GetTopProductsByRevenue(ctx context.Context, params db.GetTopProductsByRevenueParams) ([]db.GetTopProductsByRevenueRow, error) {
	args := m.Called(ctx, params)
	return args.Get(0).([]db.GetTopProductsByRevenueRow), args.Error(1)
}

func (m *MockAnalyticsQuerier) CountExpiringBatchesWithinDays(ctx context.Context, params db.CountExpiringBatchesWithinDaysParams) (interface{}, error) {
	args := m.Called(ctx, params)
	return args.Get(0), args.Error(1)
}

func (m *MockAnalyticsQuerier) GetSalesTimeSeries(ctx context.Context, params db.GetSalesTimeSeriesParams) ([]db.GetSalesTimeSeriesRow, error) {
	args := m.Called(ctx, params)
	if args.Get(0) == nil {
		return []db.GetSalesTimeSeriesRow{}, args.Error(1)
	}
	return args.Get(0).([]db.GetSalesTimeSeriesRow), args.Error(1)
}

func (m *MockAnalyticsQuerier) GetPurchasesTimeSeries(ctx context.Context, params db.GetPurchasesTimeSeriesParams) ([]db.GetPurchasesTimeSeriesRow, error) {
	args := m.Called(ctx, params)
	return args.Get(0).([]db.GetPurchasesTimeSeriesRow), args.Error(1)
}

// Test setup helper
func setupAnalyticsService(t *testing.T) (*Service, *MockAnalyticsQuerier) {
	mockQuerier := &MockAnalyticsQuerier{}
	service := NewService(nil, mockQuerier)
	return service, mockQuerier
}

func TestAnalyticsService_GetKPIs_Success(t *testing.T) {
	service, mockQuerier := setupAnalyticsService(t)
	ctx := context.Background()
	tenantID := uuid.New()

	now := time.Now()
	fromDate := now.AddDate(0, 0, -30)
	toDate := now
	windowEnd := now.AddDate(0, 0, 30)

	params := KPIParams{
		TenantID:  tenantID,
		FromDate:  fromDate,
		ToDate:    toDate,
		Threshold: 10,
		TopN:      5,
		WindowEnd: windowEnd,
	}

	// Setup mock expectations
	mockQuerier.On("GetInventoryValue", ctx, tenantID).Return(int64(100000), nil)
	mockQuerier.On("GetStockoutRiskCount", ctx, db.GetStockoutRiskCountParams{
		TenantID: tenantID,
		Quantity: "10",
	}).Return(int64(5), nil)
	mockQuerier.On("CountOpenSalesOrders", ctx, db.CountOpenSalesOrdersParams{
		TenantID:    tenantID,
		OrderDate:   fromDate,
		OrderDate_2: toDate,
	}).Return(int64(25), nil)
	mockQuerier.On("CountOpenPurchaseOrders", ctx, db.CountOpenPurchaseOrdersParams{
		TenantID:    tenantID,
		OrderDate:   fromDate,
		OrderDate_2: toDate,
	}).Return(int64(15), nil)
	mockQuerier.On("GetRevenueInPeriod", ctx, db.GetRevenueInPeriodParams{
		TenantID:    tenantID,
		OrderDate:   fromDate,
		OrderDate_2: toDate,
	}).Return(int64(50000), nil)

	// Mock top products
	topProducts := []db.GetTopProductsByRevenueRow{
		{ProductID: uuid.New(), ProductName: "Product A", ProductSku: "SKU-A", Revenue: 10000},
		{ProductID: uuid.New(), ProductName: "Product B", ProductSku: "SKU-B", Revenue: 8000},
	}
	mockQuerier.On("GetTopProductsByRevenue", ctx, db.GetTopProductsByRevenueParams{
		TenantID:    tenantID,
		OrderDate:   fromDate,
		OrderDate_2: toDate,
		Limit:       5,
	}).Return(topProducts, nil)

	mockQuerier.On("CountExpiringBatchesWithinDays", ctx, db.CountExpiringBatchesWithinDaysParams{
		TenantID: tenantID,
		Column2:  windowEnd,
	}).Return(int64(3), nil)

	// Execute
	result, err := service.GetKPIs(ctx, params)

	// Assert
	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, int64(100000), result.InventoryValue)
	assert.Equal(t, int64(5), result.StockoutRiskCount)
	assert.Equal(t, int64(25), result.OpenSalesOrdersCount)
	assert.Equal(t, int64(15), result.OpenPurchaseOrdersCount)
	assert.Equal(t, int64(50000), result.RevenueInPeriod)
	assert.Equal(t, int64(3), result.ExpiringBatchesCount)
	assert.Len(t, result.TopProductsByRevenue, 2)
	assert.Equal(t, fromDate, result.FromDate)
	assert.Equal(t, toDate, result.ToDate)

	mockQuerier.AssertExpectations(t)
}

func TestAnalyticsService_GetKPIs_EmptyTopProducts(t *testing.T) {
	service, mockQuerier := setupAnalyticsService(t)
	ctx := context.Background()
	tenantID := uuid.New()

	now := time.Now()
	fromDate := now.AddDate(0, 0, -30)
	toDate := now
	windowEnd := now.AddDate(0, 0, 30)

	params := KPIParams{
		TenantID:  tenantID,
		FromDate:  fromDate,
		ToDate:    toDate,
		Threshold: 10,
		TopN:      5,
		WindowEnd: windowEnd,
	}

	// Setup mock expectations with empty top products
	mockQuerier.On("GetInventoryValue", ctx, tenantID).Return(int64(50000), nil)
	mockQuerier.On("GetStockoutRiskCount", ctx, mock.Anything).Return(int64(0), nil)
	mockQuerier.On("CountOpenSalesOrders", ctx, mock.Anything).Return(int64(0), nil)
	mockQuerier.On("CountOpenPurchaseOrders", ctx, mock.Anything).Return(int64(0), nil)
	mockQuerier.On("GetRevenueInPeriod", ctx, mock.Anything).Return(int64(0), nil)
	mockQuerier.On("GetTopProductsByRevenue", ctx, mock.Anything).Return([]db.GetTopProductsByRevenueRow{}, nil)
	mockQuerier.On("CountExpiringBatchesWithinDays", ctx, mock.Anything).Return(int64(0), nil)

	// Execute
	result, err := service.GetKPIs(ctx, params)

	// Assert
	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, int64(50000), result.InventoryValue)
	assert.Equal(t, int64(0), result.StockoutRiskCount)
	assert.Len(t, result.TopProductsByRevenue, 0)

	mockQuerier.AssertExpectations(t)
}

func TestAnalyticsService_GetKPIs_InventoryValueQueryError(t *testing.T) {
	service, mockQuerier := setupAnalyticsService(t)
	ctx := context.Background()
	tenantID := uuid.New()

	params := KPIParams{
		TenantID: tenantID,
		FromDate: time.Now().AddDate(0, 0, -30),
		ToDate:   time.Now(),
	}

	// Setup mock to return error for inventory value
	mockQuerier.On("GetInventoryValue", ctx, tenantID).Return(nil, errors.New("database connection failed"))

	// Execute
	result, err := service.GetKPIs(ctx, params)

	// Assert
	assert.Error(t, err)
	assert.Nil(t, result)
	assert.Contains(t, err.Error(), "database connection failed")

	mockQuerier.AssertExpectations(t)
}

func TestAnalyticsService_GetKPIs_StockoutRiskQueryError(t *testing.T) {
	service, mockQuerier := setupAnalyticsService(t)
	ctx := context.Background()
	tenantID := uuid.New()

	params := KPIParams{
		TenantID: tenantID,
		FromDate: time.Now().AddDate(0, 0, -30),
		ToDate:   time.Now(),
	}

	// Setup mocks
	mockQuerier.On("GetInventoryValue", ctx, tenantID).Return(int64(100000), nil)
	mockQuerier.On("GetStockoutRiskCount", ctx, mock.Anything).Return(nil, errors.New("stockout query failed"))

	// Execute
	result, err := service.GetKPIs(ctx, params)

	// Assert
	assert.Error(t, err)
	assert.Nil(t, result)
	assert.Contains(t, err.Error(), "stockout query failed")

	mockQuerier.AssertExpectations(t)
}

func TestAnalyticsService_GetSalesSeries_Success(t *testing.T) {
	service, mockQuerier := setupAnalyticsService(t)
	ctx := context.Background()
	tenantID := uuid.New()

	now := time.Now()
	fromDate := now.AddDate(0, 0, -7)
	toDate := now

	params := SeriesParams{
		TenantID: tenantID,
		FromDate: fromDate,
		ToDate:   toDate,
		Group:    "day",
	}

	// Mock sales time series data
	salesRows := []db.GetSalesTimeSeriesRow{
		{Period: 1, Revenue: int64(1000)}, // Unix timestamp for day 1
		{Period: 2, Revenue: int64(2000)}, // Unix timestamp for day 2
		{Period: 3, Revenue: int64(1500)}, // Unix timestamp for day 3
	}

	mockQuerier.On("GetSalesTimeSeries", ctx, db.GetSalesTimeSeriesParams{
		Grp:      "day",
		TenantID: tenantID,
		FromDate: fromDate,
		ToDate:   toDate,
	}).Return(salesRows, nil)

	// Execute
	result, err := service.GetSalesSeries(ctx, params)

	// Assert
	assert.NoError(t, err)
	assert.Len(t, result, 3)
	assert.Equal(t, int64(1000), result[0].Value)
	assert.Equal(t, int64(2000), result[1].Value)
	assert.Equal(t, int64(1500), result[2].Value)

	// Verify periods are properly bucketed
	for i, point := range result {
		expectedTime := time.Unix(int64(i+1), 0)
		expectedBucket := time.Date(expectedTime.Year(), expectedTime.Month(), expectedTime.Day(), 0, 0, 0, 0, time.UTC)
		assert.Equal(t, expectedBucket, point.Period)
	}

	mockQuerier.AssertExpectations(t)
}

func TestAnalyticsService_GetSalesSeries_QueryError(t *testing.T) {
	service, mockQuerier := setupAnalyticsService(t)
	ctx := context.Background()
	tenantID := uuid.New()

	params := SeriesParams{
		TenantID: tenantID,
		FromDate: time.Now().AddDate(0, 0, -7),
		ToDate:   time.Now(),
		Group:    "day",
	}

	// Setup mock to return empty slice (this is the bug from the existing test)
	mockQuerier.On("GetSalesTimeSeries", ctx, mock.Anything).Return(nil, nil)

	// Execute
	result, err := service.GetSalesSeries(ctx, params)

	// Assert - this should handle the nil slice gracefully
	assert.NoError(t, err)
	assert.Len(t, result, 0)

	mockQuerier.AssertExpectations(t)
}

func TestAnalyticsService_GetPurchasesSeries_Success(t *testing.T) {
	service, mockQuerier := setupAnalyticsService(t)
	ctx := context.Background()
	tenantID := uuid.New()

	now := time.Now()
	fromDate := now.AddDate(0, 0, -7)
	toDate := now

	params := SeriesParams{
		TenantID: tenantID,
		FromDate: fromDate,
		ToDate:   toDate,
		Group:    "month",
	}

	// Mock purchases time series data
	purchaseRows := []db.GetPurchasesTimeSeriesRow{
		{Period: 1, TotalCost: int64(5000)}, // Unix timestamp for month 1
		{Period: 2, TotalCost: int64(7000)}, // Unix timestamp for month 2
	}

	mockQuerier.On("GetPurchasesTimeSeries", ctx, db.GetPurchasesTimeSeriesParams{
		Grp:      "month",
		TenantID: tenantID,
		FromDate: fromDate,
		ToDate:   toDate,
	}).Return(purchaseRows, nil)

	// Execute
	result, err := service.GetPurchasesSeries(ctx, params)

	// Assert
	assert.NoError(t, err)
	assert.Len(t, result, 2)
	assert.Equal(t, int64(5000), result[0].Value)
	assert.Equal(t, int64(7000), result[1].Value)

	mockQuerier.AssertExpectations(t)
}

func TestAnalyticsService_GetPurchasesSeries_EmptyResult(t *testing.T) {
	service, mockQuerier := setupAnalyticsService(t)
	ctx := context.Background()
	tenantID := uuid.New()

	params := SeriesParams{
		TenantID: tenantID,
		FromDate: time.Now().AddDate(0, 0, -7),
		ToDate:   time.Now(),
		Group:    "day",
	}

	// Mock empty result
	mockQuerier.On("GetPurchasesTimeSeries", ctx, mock.Anything).Return([]db.GetPurchasesTimeSeriesRow{}, nil)

	// Execute
	result, err := service.GetPurchasesSeries(ctx, params)

	// Assert
	assert.NoError(t, err)
	assert.Len(t, result, 0)

	mockQuerier.AssertExpectations(t)
}

func TestAnalyticsService_NewService(t *testing.T) {
	mockQuerier := &MockAnalyticsQuerier{}
	service := NewService(nil, mockQuerier)

	assert.NotNil(t, service)
	assert.Equal(t, mockQuerier, service.queries)
}

// Test helper functions
func TestToInt64_VariousTypes(t *testing.T) {
	tests := []struct {
		name     string
		input    interface{}
		expected int64
	}{
		{"int64", int64(42), int64(42)},
		{"int32", int32(42), int64(42)},
		{"float64", float64(42.0), int64(42)},
		{"float32", float32(42.0), int64(42)},
		{"nil", nil, int64(0)},
		{"unsupported", "string", int64(0)},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := toInt64(tt.input)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestPeriodToBucketStart_DayGrouping(t *testing.T) {
	baseTime := time.Date(2023, 1, 15, 10, 30, 45, 0, time.UTC)

	// Test day grouping
	result := periodToBucketStart(1673740800, "day", baseTime) // Jan 15, 2023 00:00:00 UTC

	expected := time.Date(2023, 1, 15, 0, 0, 0, 0, time.UTC)
	assert.Equal(t, expected, result)
}

func TestPeriodToBucketStart_MonthGrouping(t *testing.T) {
	baseTime := time.Date(2023, 1, 15, 10, 30, 45, 0, time.UTC)

	// Test month grouping
	result := periodToBucketStart(1672531200, "month", baseTime) // Jan 1, 2023 00:00:00 UTC

	expected := time.Date(2023, 1, 1, 0, 0, 0, 0, time.UTC)
	assert.Equal(t, expected, result)
}

func TestNumericFromInt64(t *testing.T) {
	result := numericFromInt64(42)

	assert.True(t, result.Valid)
	assert.Equal(t, int64(42), result.Int.Int64())
	assert.Equal(t, int32(0), result.Exp)
}

// Test edge cases and error scenarios
func TestAnalyticsService_GetKPIs_AllErrors(t *testing.T) {
	service, mockQuerier := setupAnalyticsService(t)
	ctx := context.Background()
	tenantID := uuid.New()

	params := KPIParams{
		TenantID: tenantID,
		FromDate: time.Now().AddDate(0, 0, -30),
		ToDate:   time.Now(),
	}

	// Test each error condition
	testCases := []struct {
		name        string
		setupMocks  func()
		expectError bool
	}{
		{
			name: "inventory value error",
			setupMocks: func() {
				mockQuerier.On("GetInventoryValue", ctx, tenantID).Return(nil, errors.New("inventory error"))
			},
			expectError: true,
		},
		{
			name: "stockout risk error",
			setupMocks: func() {
				mockQuerier.On("GetInventoryValue", ctx, tenantID).Return(int64(1000), nil)
				mockQuerier.On("GetStockoutRiskCount", ctx, mock.Anything).Return(nil, errors.New("stockout error"))
			},
			expectError: true,
		},
		{
			name: "sales orders error",
			setupMocks: func() {
				mockQuerier.On("GetInventoryValue", ctx, tenantID).Return(int64(1000), nil)
				mockQuerier.On("GetStockoutRiskCount", ctx, mock.Anything).Return(int64(5), nil)
				mockQuerier.On("CountOpenSalesOrders", ctx, mock.Anything).Return(int64(0), errors.New("sales orders error"))
			},
			expectError: true,
		},
		{
			name: "purchase orders error",
			setupMocks: func() {
				mockQuerier.On("GetInventoryValue", ctx, tenantID).Return(int64(1000), nil)
				mockQuerier.On("GetStockoutRiskCount", ctx, mock.Anything).Return(int64(5), nil)
				mockQuerier.On("CountOpenSalesOrders", ctx, mock.Anything).Return(int64(25), nil)
				mockQuerier.On("CountOpenPurchaseOrders", ctx, mock.Anything).Return(int64(0), errors.New("purchase orders error"))
			},
			expectError: true,
		},
		{
			name: "revenue error",
			setupMocks: func() {
				mockQuerier.On("GetInventoryValue", ctx, tenantID).Return(int64(1000), nil)
				mockQuerier.On("GetStockoutRiskCount", ctx, mock.Anything).Return(int64(5), nil)
				mockQuerier.On("CountOpenSalesOrders", ctx, mock.Anything).Return(int64(25), nil)
				mockQuerier.On("CountOpenPurchaseOrders", ctx, mock.Anything).Return(int64(15), nil)
				mockQuerier.On("GetRevenueInPeriod", ctx, mock.Anything).Return(nil, errors.New("revenue error"))
			},
			expectError: true,
		},
		{
			name: "top products error",
			setupMocks: func() {
				mockQuerier.On("GetInventoryValue", ctx, tenantID).Return(int64(1000), nil)
				mockQuerier.On("GetStockoutRiskCount", ctx, mock.Anything).Return(int64(5), nil)
				mockQuerier.On("CountOpenSalesOrders", ctx, mock.Anything).Return(int64(25), nil)
				mockQuerier.On("CountOpenPurchaseOrders", ctx, mock.Anything).Return(int64(15), nil)
				mockQuerier.On("GetRevenueInPeriod", ctx, mock.Anything).Return(int64(50000), nil)
				mockQuerier.On("GetTopProductsByRevenue", ctx, mock.Anything).Return([]db.GetTopProductsByRevenueRow{}, errors.New("top products error"))
			},
			expectError: true,
		},
		{
			name: "expiring batches error",
			setupMocks: func() {
				mockQuerier.On("GetInventoryValue", ctx, tenantID).Return(int64(1000), nil)
				mockQuerier.On("GetStockoutRiskCount", ctx, mock.Anything).Return(int64(5), nil)
				mockQuerier.On("CountOpenSalesOrders", ctx, mock.Anything).Return(int64(25), nil)
				mockQuerier.On("CountOpenPurchaseOrders", ctx, mock.Anything).Return(int64(15), nil)
				mockQuerier.On("GetRevenueInPeriod", ctx, mock.Anything).Return(int64(50000), nil)
				mockQuerier.On("GetTopProductsByRevenue", ctx, mock.Anything).Return([]db.GetTopProductsByRevenueRow{}, nil)
				mockQuerier.On("CountExpiringBatchesWithinDays", ctx, mock.Anything).Return(nil, errors.New("expiring batches error"))
			},
			expectError: true,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			// Clear previous expectations
			mockQuerier = &MockAnalyticsQuerier{}
			service = NewService(nil, mockQuerier)

			tc.setupMocks()

			result, err := service.GetKPIs(ctx, params)

			if tc.expectError {
				assert.Error(t, err)
				assert.Nil(t, result)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, result)
			}
		})
	}
}