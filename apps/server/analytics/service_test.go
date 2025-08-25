package analytics

import (
	"context"
	"fmt"
	"math/big"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"

	"agromart2/db"
)

// MockQueries implements the database queries interface for testing
type MockQueries struct {
	mock.Mock
}

func (m *MockQueries) GetInventoryValue(ctx context.Context, tenantID uuid.UUID) (interface{}, error) {
	args := m.Called(ctx, tenantID)
	return args.Get(0), args.Error(1)
}

func (m *MockQueries) GetStockoutRiskCount(ctx context.Context, params db.GetStockoutRiskCountParams) (interface{}, error) {
	args := m.Called(ctx, params)
	return args.Get(0), args.Error(1)
}

func (m *MockQueries) CountOpenSalesOrders(ctx context.Context, params db.CountOpenSalesOrdersParams) (int64, error) {
	args := m.Called(ctx, params)
	return args.Get(0).(int64), args.Error(1)
}

func (m *MockQueries) CountOpenPurchaseOrders(ctx context.Context, params db.CountOpenPurchaseOrdersParams) (int64, error) {
	args := m.Called(ctx, params)
	return args.Get(0).(int64), args.Error(1)
}

func (m *MockQueries) GetRevenueInPeriod(ctx context.Context, params db.GetRevenueInPeriodParams) (interface{}, error) {
	args := m.Called(ctx, params)
	return args.Get(0), args.Error(1)
}

func (m *MockQueries) GetTopProductsByRevenue(ctx context.Context, params db.GetTopProductsByRevenueParams) ([]db.GetTopProductsByRevenueRow, error) {
	args := m.Called(ctx, params)
	return args.Get(0).([]db.GetTopProductsByRevenueRow), args.Error(1)
}

func (m *MockQueries) CountExpiringBatchesWithinDays(ctx context.Context, params db.CountExpiringBatchesWithinDaysParams) (interface{}, error) {
	args := m.Called(ctx, params)
	return args.Get(0), args.Error(1)
}

func (m *MockQueries) GetSalesTimeSeries(ctx context.Context, params db.GetSalesTimeSeriesParams) ([]db.GetSalesTimeSeriesRow, error) {
	args := m.Called(ctx, params)
	return args.Get(0).([]db.GetSalesTimeSeriesRow), args.Error(1)
}

func (m *MockQueries) GetPurchasesTimeSeries(ctx context.Context, params db.GetPurchasesTimeSeriesParams) ([]db.GetPurchasesTimeSeriesRow, error) {
	args := m.Called(ctx, params)
	return args.Get(0).([]db.GetPurchasesTimeSeriesRow), args.Error(1)
}

func TestNewService(t *testing.T) {
	t.Run("creates new analytics service", func(t *testing.T) {
		mockQueries := &MockQueries{}
		service := NewService(nil, mockQueries)

		assert.NotNil(t, service)
		assert.Equal(t, mockQueries, service.queries)
		assert.Nil(t, service.db)
	})
}

func TestService_GetKPIs(t *testing.T) {
	tenantID := uuid.New()
	fromDate := time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC)
	toDate := time.Date(2024, 1, 31, 23, 59, 59, 0, time.UTC)
	windowEnd := time.Date(2024, 2, 15, 0, 0, 0, 0, time.UTC)

	kpiParams := KPIParams{
		TenantID:  tenantID,
		FromDate:  fromDate,
		ToDate:    toDate,
		Threshold: 10,
		TopN:      5,
		WindowEnd: windowEnd,
	}

	t.Run("successfully retrieves all KPIs", func(t *testing.T) {
		mockQueries := &MockQueries{}
		service := NewService(nil, mockQueries)

		// Mock responses
		inventoryValue := int64(150000)
		stockoutRisk := int64(5)
		openSalesOrders := int64(12)
		openPurchaseOrders := int64(8)
		revenue := int64(50000)
		expiringBatches := int64(3)

		topProducts := []db.GetTopProductsByRevenueRow{
			{
				ProductID:   uuid.New(),
				ProductName: "Product A",
				ProductSku:  "SKU001",
				Revenue:     20000,
			},
			{
				ProductID:   uuid.New(),
				ProductName: "Product B",
				ProductSku:  "SKU002",
				Revenue:     15000,
			},
		}

		// Set up expectations
		mockQueries.On("GetInventoryValue", mock.Anything, tenantID).Return(inventoryValue, nil)

		stockoutParams := db.GetStockoutRiskCountParams{
			TenantID: tenantID,
			Quantity: "10", // Use string instead of pgtype.Numeric
		}
		mockQueries.On("GetStockoutRiskCount", mock.Anything, stockoutParams).Return(stockoutRisk, nil)

		soParams := db.CountOpenSalesOrdersParams{
			TenantID:    tenantID,
			OrderDate:   fromDate,
			OrderDate_2: toDate,
		}
		mockQueries.On("CountOpenSalesOrders", mock.Anything, soParams).Return(openSalesOrders, nil)

		poParams := db.CountOpenPurchaseOrdersParams{
			TenantID:    tenantID,
			OrderDate:   fromDate,
			OrderDate_2: toDate,
		}
		mockQueries.On("CountOpenPurchaseOrders", mock.Anything, poParams).Return(openPurchaseOrders, nil)

		revenueParams := db.GetRevenueInPeriodParams{
			TenantID:    tenantID,
			OrderDate:   fromDate,
			OrderDate_2: toDate,
		}
		mockQueries.On("GetRevenueInPeriod", mock.Anything, revenueParams).Return(revenue, nil)

		topProductsParams := db.GetTopProductsByRevenueParams{
			TenantID:    tenantID,
			OrderDate:   fromDate,
			OrderDate_2: toDate,
			Limit:       5,
		}
		mockQueries.On("GetTopProductsByRevenue", mock.Anything, topProductsParams).Return(topProducts, nil)

		expiringParams := db.CountExpiringBatchesWithinDaysParams{
			TenantID: tenantID,
			Column2:  windowEnd,
		}
		mockQueries.On("CountExpiringBatchesWithinDays", mock.Anything, expiringParams).Return(expiringBatches, nil)

		// Execute
		ctx := context.Background()
		result, err := service.GetKPIs(ctx, kpiParams)

		// Verify
		require.NoError(t, err)
		assert.NotNil(t, result)
		assert.Equal(t, inventoryValue, result.InventoryValue)
		assert.Equal(t, stockoutRisk, result.StockoutRiskCount)
		assert.Equal(t, openSalesOrders, result.OpenSalesOrdersCount)
		assert.Equal(t, openPurchaseOrders, result.OpenPurchaseOrdersCount)
		assert.Equal(t, revenue, result.RevenueInPeriod)
		assert.Equal(t, expiringBatches, result.ExpiringBatchesCount)
		assert.Equal(t, fromDate, result.FromDate)
		assert.Equal(t, toDate, result.ToDate)

		assert.Len(t, result.TopProductsByRevenue, 2)
		assert.Equal(t, topProducts[0].ProductID, result.TopProductsByRevenue[0].ProductID)
		assert.Equal(t, topProducts[0].ProductName, result.TopProductsByRevenue[0].ProductName)
		assert.Equal(t, topProducts[0].ProductSku, result.TopProductsByRevenue[0].ProductSKU)
		assert.Equal(t, topProducts[0].Revenue, result.TopProductsByRevenue[0].Revenue)

		mockQueries.AssertExpectations(t)
	})

	t.Run("handles inventory value query error", func(t *testing.T) {
		mockQueries := &MockQueries{}
		service := NewService(nil, mockQueries)

		expectedError := fmt.Errorf("database error")
		mockQueries.On("GetInventoryValue", mock.Anything, tenantID).Return(nil, expectedError)

		ctx := context.Background()
		result, err := service.GetKPIs(ctx, kpiParams)

		assert.Error(t, err)
		assert.Nil(t, result)
		assert.Equal(t, expectedError, err)
	})

	t.Run("handles stockout risk query error", func(t *testing.T) {
		mockQueries := &MockQueries{}
		service := NewService(nil, mockQueries)

		mockQueries.On("GetInventoryValue", mock.Anything, tenantID).Return(int64(100000), nil)

		expectedError := fmt.Errorf("stockout query error")
		stockoutParams := db.GetStockoutRiskCountParams{
			TenantID: tenantID,
			Quantity: "10", // Use string instead of pgtype.Numeric
		}
		mockQueries.On("GetStockoutRiskCount", mock.Anything, stockoutParams).Return(nil, expectedError)

		ctx := context.Background()
		result, err := service.GetKPIs(ctx, kpiParams)

		assert.Error(t, err)
		assert.Nil(t, result)
		assert.Equal(t, expectedError, err)
	})

	t.Run("handles empty top products list", func(t *testing.T) {
		mockQueries := &MockQueries{}
		service := NewService(nil, mockQueries)

		// Mock all required calls with empty top products
		mockQueries.On("GetInventoryValue", mock.Anything, tenantID).Return(int64(100000), nil)
		mockQueries.On("GetStockoutRiskCount", mock.Anything, mock.Anything).Return(int64(0), nil)
		mockQueries.On("CountOpenSalesOrders", mock.Anything, mock.Anything).Return(int64(0), nil)
		mockQueries.On("CountOpenPurchaseOrders", mock.Anything, mock.Anything).Return(int64(0), nil)
		mockQueries.On("GetRevenueInPeriod", mock.Anything, mock.Anything).Return(int64(0), nil)
		mockQueries.On("GetTopProductsByRevenue", mock.Anything, mock.Anything).Return([]db.GetTopProductsByRevenueRow{}, nil)
		mockQueries.On("CountExpiringBatchesWithinDays", mock.Anything, mock.Anything).Return(int64(0), nil)

		ctx := context.Background()
		result, err := service.GetKPIs(ctx, kpiParams)

		require.NoError(t, err)
		assert.NotNil(t, result)
		assert.Empty(t, result.TopProductsByRevenue)
	})
}

func TestService_GetSalesSeries(t *testing.T) {
	tenantID := uuid.New()
	fromDate := time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC)
	toDate := time.Date(2024, 1, 31, 23, 59, 59, 0, time.UTC)

	seriesParams := SeriesParams{
		TenantID: tenantID,
		FromDate: fromDate,
		ToDate:   toDate,
		Group:    "day",
	}

	t.Run("successfully retrieves sales time series", func(t *testing.T) {
		mockQueries := &MockQueries{}
		service := NewService(nil, mockQueries)

		mockRows := []db.GetSalesTimeSeriesRow{
			{
				Period:  86400, // 1 day in seconds
				Revenue: int64(5000),
			},
			{
				Period:  172800, // 2 days in seconds
				Revenue: int64(7500),
			},
		}

		expectedParams := db.GetSalesTimeSeriesParams{
			Grp:      "day",
			TenantID: tenantID,
			FromDate: fromDate,
			ToDate:   toDate,
		}

		mockQueries.On("GetSalesTimeSeries", mock.Anything, expectedParams).Return(mockRows, nil)

		ctx := context.Background()
		result, err := service.GetSalesSeries(ctx, seriesParams)

		require.NoError(t, err)
		assert.Len(t, result, 2)
		assert.Equal(t, int64(5000), result[0].Value)
		assert.Equal(t, int64(7500), result[1].Value)
	})

	t.Run("handles query error", func(t *testing.T) {
		mockQueries := &MockQueries{}
		service := NewService(nil, mockQueries)

		expectedError := fmt.Errorf("time series query error")
		mockQueries.On("GetSalesTimeSeries", mock.Anything, mock.Anything).Return([]db.GetSalesTimeSeriesRow{}, expectedError)

		ctx := context.Background()
		result, err := service.GetSalesSeries(ctx, seriesParams)

		assert.Error(t, err)
		assert.Nil(t, result)
		assert.Equal(t, expectedError, err)
	})

	t.Run("handles empty result set", func(t *testing.T) {
		mockQueries := &MockQueries{}
		service := NewService(nil, mockQueries)

		mockQueries.On("GetSalesTimeSeries", mock.Anything, mock.Anything).Return([]db.GetSalesTimeSeriesRow{}, nil)

		ctx := context.Background()
		result, err := service.GetSalesSeries(ctx, seriesParams)

		require.NoError(t, err)
		assert.Empty(t, result)
	})

	t.Run("handles monthly grouping", func(t *testing.T) {
		mockQueries := &MockQueries{}
		service := NewService(nil, mockQueries)

		monthlyParams := seriesParams
		monthlyParams.Group = "month"

		mockRows := []db.GetSalesTimeSeriesRow{
			{
				Period:  2592000, // ~30 days in seconds
				Revenue: int64(50000),
			},
		}

		mockQueries.On("GetSalesTimeSeries", mock.Anything, mock.Anything).Return(mockRows, nil)

		ctx := context.Background()
		result, err := service.GetSalesSeries(ctx, monthlyParams)

		require.NoError(t, err)
		assert.Len(t, result, 1)
		assert.Equal(t, int64(50000), result[0].Value)
	})
}

func TestService_GetPurchasesSeries(t *testing.T) {
	tenantID := uuid.New()
	fromDate := time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC)
	toDate := time.Date(2024, 1, 31, 23, 59, 59, 0, time.UTC)

	seriesParams := SeriesParams{
		TenantID: tenantID,
		FromDate: fromDate,
		ToDate:   toDate,
		Group:    "day",
	}

	t.Run("successfully retrieves purchases time series", func(t *testing.T) {
		mockQueries := &MockQueries{}
		service := NewService(nil, mockQueries)

		mockRows := []db.GetPurchasesTimeSeriesRow{
			{
				Period:    86400, // 1 day in seconds
				TotalCost: int64(3000),
			},
			{
				Period:    172800, // 2 days in seconds
				TotalCost: int64(4500),
			},
		}

		expectedParams := db.GetPurchasesTimeSeriesParams{
			Grp:      "day",
			TenantID: tenantID,
			FromDate: fromDate,
			ToDate:   toDate,
		}

		mockQueries.On("GetPurchasesTimeSeries", mock.Anything, expectedParams).Return(mockRows, nil)

		ctx := context.Background()
		result, err := service.GetPurchasesSeries(ctx, seriesParams)

		require.NoError(t, err)
		assert.Len(t, result, 2)
		assert.Equal(t, int64(3000), result[0].Value)
		assert.Equal(t, int64(4500), result[1].Value)
	})

	t.Run("handles query error", func(t *testing.T) {
		mockQueries := &MockQueries{}
		service := NewService(nil, mockQueries)

		expectedError := fmt.Errorf("purchases time series query error")
		mockQueries.On("GetPurchasesTimeSeries", mock.Anything, mock.Anything).Return([]db.GetPurchasesTimeSeriesRow{}, expectedError)

		ctx := context.Background()
		result, err := service.GetPurchasesSeries(ctx, seriesParams)

		assert.Error(t, err)
		assert.Nil(t, result)
		assert.Equal(t, expectedError, err)
	})
}

func TestHelperFunctions(t *testing.T) {
	t.Run("numericFromInt64", func(t *testing.T) {
		testCases := []struct {
			name     string
			input    int64
			expected int64
		}{
			{"positive number", 100, 100},
			{"zero", 0, 0},
			{"negative number", -50, -50},
			{"large number", 999999999, 999999999},
		}

		for _, tc := range testCases {
			t.Run(tc.name, func(t *testing.T) {
				result := numericFromInt64(tc.input)

				assert.True(t, result.Valid)
				assert.Equal(t, int32(0), result.Exp) // scale should be 0
				assert.True(t, result.Int.IsInt64())
				assert.Equal(t, tc.expected, result.Int.Int64())
			})
		}
	})

	t.Run("toInt64", func(t *testing.T) {
		t.Run("handles int64", func(t *testing.T) {
			result := toInt64(int64(123))
			assert.Equal(t, int64(123), result)
		})

		t.Run("handles int32", func(t *testing.T) {
			result := toInt64(int32(456))
			assert.Equal(t, int64(456), result)
		})

		t.Run("handles float64", func(t *testing.T) {
			result := toInt64(float64(789.99))
			assert.Equal(t, int64(789), result)
		})

		t.Run("handles float32", func(t *testing.T) {
			result := toInt64(float32(321.5))
			assert.Equal(t, int64(321), result)
		})

		t.Run("handles valid pgtype.Int8", func(t *testing.T) {
			pgInt := pgtype.Int8{Int64: 999, Valid: true}
			result := toInt64(pgInt)
			assert.Equal(t, int64(999), result)
		})

		t.Run("handles invalid pgtype.Int8", func(t *testing.T) {
			pgInt := pgtype.Int8{Int64: 999, Valid: false}
			result := toInt64(pgInt)
			assert.Equal(t, int64(0), result)
		})

		t.Run("handles valid pgtype.Numeric", func(t *testing.T) {
			pgNum := pgtype.Numeric{
				Int:   big.NewInt(555),
				Exp:   0,
				Valid: true,
			}
			result := toInt64(pgNum)
			assert.Equal(t, int64(555), result)
		})

		t.Run("handles invalid pgtype.Numeric", func(t *testing.T) {
			pgNum := pgtype.Numeric{
				Int:   big.NewInt(555),
				Exp:   0,
				Valid: false,
			}
			result := toInt64(pgNum)
			assert.Equal(t, int64(0), result)
		})

		t.Run("handles unsupported type", func(t *testing.T) {
			result := toInt64("string")
			assert.Equal(t, int64(0), result)
		})

		t.Run("handles nil", func(t *testing.T) {
			result := toInt64(nil)
			assert.Equal(t, int64(0), result)
		})
	})

	t.Run("intervalToBucketStart", func(t *testing.T) {
		fromDate := time.Date(2024, 1, 15, 12, 30, 45, 0, time.UTC)

		t.Run("handles invalid interval", func(t *testing.T) {
			iv := pgtype.Interval{Valid: false}
			result := intervalToBucketStart(iv, "day", fromDate)
			assert.Equal(t, fromDate, result)
		})

		t.Run("handles day grouping", func(t *testing.T) {
			iv := pgtype.Interval{Days: 5, Valid: true}
			result := intervalToBucketStart(iv, "day", fromDate)

			expected := time.Date(2024, 1, 20, 0, 0, 0, 0, time.UTC)
			assert.Equal(t, expected, result)
		})

		t.Run("handles month grouping", func(t *testing.T) {
			iv := pgtype.Interval{Months: 2, Valid: true}
			result := intervalToBucketStart(iv, "month", fromDate)

			expected := time.Date(2024, 3, 1, 0, 0, 0, 0, time.UTC)
			assert.Equal(t, expected, result)
		})

		t.Run("handles microseconds", func(t *testing.T) {
			iv := pgtype.Interval{
				Microseconds: 3600000000, // 1 hour in microseconds
				Valid:        true,
			}
			result := intervalToBucketStart(iv, "day", fromDate)

			expected := time.Date(2024, 1, 15, 0, 0, 0, 0, time.UTC) // normalized to day start
			assert.Equal(t, expected, result)
		})

		t.Run("handles complex interval", func(t *testing.T) {
			iv := pgtype.Interval{
				Months:       1,
				Days:         10,
				Microseconds: 7200000000, // 2 hours
				Valid:        true,
			}
			result := intervalToBucketStart(iv, "day", fromDate)

			// Should be normalized to day start
			assert.Equal(t, 2024, result.Year())
			assert.Equal(t, time.February, result.Month())
			assert.Equal(t, 25, result.Day())
			assert.Equal(t, 0, result.Hour())
			assert.Equal(t, 0, result.Minute())
			assert.Equal(t, 0, result.Second())
		})
	})
}

func TestKPIParamsValidation(t *testing.T) {
	t.Run("valid KPI parameters", func(t *testing.T) {
		tenantID := uuid.New()
		fromDate := time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC)
		toDate := time.Date(2024, 1, 31, 23, 59, 59, 0, time.UTC)
		windowEnd := time.Date(2024, 2, 15, 0, 0, 0, 0, time.UTC)

		params := KPIParams{
			TenantID:  tenantID,
			FromDate:  fromDate,
			ToDate:    toDate,
			Threshold: 10,
			TopN:      5,
			WindowEnd: windowEnd,
		}

		assert.NotEqual(t, uuid.Nil, params.TenantID)
		assert.True(t, params.FromDate.Before(params.ToDate))
		assert.True(t, params.Threshold > 0)
		assert.True(t, params.TopN > 0)
	})
}

func TestSeriesParamsValidation(t *testing.T) {
	t.Run("valid series parameters", func(t *testing.T) {
		tenantID := uuid.New()
		fromDate := time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC)
		toDate := time.Date(2024, 1, 31, 23, 59, 59, 0, time.UTC)

		params := SeriesParams{
			TenantID: tenantID,
			FromDate: fromDate,
			ToDate:   toDate,
			Group:    "day",
		}

		assert.NotEqual(t, uuid.Nil, params.TenantID)
		assert.True(t, params.FromDate.Before(params.ToDate))
		assert.Contains(t, []string{"day", "month"}, params.Group)
	})
}

// Benchmark tests
func BenchmarkService_GetKPIs(b *testing.B) {
	mockQueries := &MockQueries{}
	service := NewService(nil, mockQueries)

	tenantID := uuid.New()
	kpiParams := KPIParams{
		TenantID:  tenantID,
		FromDate:  time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC),
		ToDate:    time.Date(2024, 1, 31, 23, 59, 59, 0, time.UTC),
		Threshold: 10,
		TopN:      5,
		WindowEnd: time.Date(2024, 2, 15, 0, 0, 0, 0, time.UTC),
	}

	// Set up mock expectations (simplified for benchmark)
	mockQueries.On("GetInventoryValue", mock.Anything, mock.Anything).Return(int64(100000), nil)
	mockQueries.On("GetStockoutRiskCount", mock.Anything, mock.Anything).Return(int64(5), nil)
	mockQueries.On("CountOpenSalesOrders", mock.Anything, mock.Anything).Return(int64(10), nil)
	mockQueries.On("CountOpenPurchaseOrders", mock.Anything, mock.Anything).Return(int64(5), nil)
	mockQueries.On("GetRevenueInPeriod", mock.Anything, mock.Anything).Return(int64(50000), nil)
	mockQueries.On("GetTopProductsByRevenue", mock.Anything, mock.Anything).Return([]db.GetTopProductsByRevenueRow{}, nil)
	mockQueries.On("CountExpiringBatchesWithinDays", mock.Anything, mock.Anything).Return(int64(2), nil)

	ctx := context.Background()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, err := service.GetKPIs(ctx, kpiParams)
		if err != nil {
			b.Fatal(err)
		}
	}
}

func BenchmarkToInt64(b *testing.B) {
	testValues := []interface{}{
		int64(123),
		int32(456),
		float64(789.99),
		pgtype.Int8{Int64: 999, Valid: true},
		pgtype.Numeric{Int: big.NewInt(555), Exp: 0, Valid: true},
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		for _, val := range testValues {
			_ = toInt64(val)
		}
	}
}

func BenchmarkNumericFromInt64(b *testing.B) {
	testValues := []int64{0, 100, -50, 999999999}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		for _, val := range testValues {
			_ = numericFromInt64(val)
		}
	}
}
