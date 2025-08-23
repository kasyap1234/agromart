package database

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// DatabaseOptimizer provides database performance optimization utilities
type DatabaseOptimizer struct {
	db *pgxpool.Pool
}

// NewDatabaseOptimizer creates a new database optimizer instance
func NewDatabaseOptimizer(db *pgxpool.Pool) *DatabaseOptimizer {
	return &DatabaseOptimizer{db: db}
}

// QueryPlan represents a database query execution plan
type QueryPlan struct {
	Query       string        `json:"query"`
	Plan        string        `json:"plan"`
	Duration    time.Duration `json:"duration"`
	TotalCost   float64       `json:"total_cost"`
	ActualRows  int           `json:"actual_rows"`
	PlannedRows int           `json:"planned_rows"`
}

// PerformanceMetrics holds database performance metrics
type PerformanceMetrics struct {
	ActiveConnections     int           `json:"active_connections"`
	IdleConnections       int           `json:"idle_connections"`
	TotalConnections      int           `json:"total_connections"`
	LongestRunningQuery   time.Duration `json:"longest_running_query"`
	AverageQueryTime      time.Duration `json:"average_query_time"`
	SlowQueries           []string      `json:"slow_queries"`
	ConnectionPoolStats   PoolStats     `json:"connection_pool_stats"`
	CacheHitRate          float64       `json:"cache_hit_rate"`
	IndexUsage            []IndexUsage  `json:"index_usage"`
	TableBloat            []TableBloat  `json:"table_bloat"`
}

// PoolStats represents connection pool statistics
type PoolStats struct {
	AcquiredConnections int           `json:"acquired_connections"`
	ConstructingConnections int       `json:"constructing_connections"`
	IdleConnections     int           `json:"idle_connections"`
	MaxConnections      int           `json:"max_connections"`
	TotalConnections    int           `json:"total_connections"`
	AverageWaitTime     time.Duration `json:"average_wait_time"`
}

// IndexUsage represents index usage statistics
type IndexUsage struct {
	TableName    string  `json:"table_name"`
	IndexName    string  `json:"index_name"`
	UsageCount   int64   `json:"usage_count"`
	SizeBytes    int64   `json:"size_bytes"`
	ScanCount    int64   `json:"scan_count"`
	IsUsed       bool    `json:"is_used"`
}

// TableBloat represents table bloat information
type TableBloat struct {
	TableName     string  `json:"table_name"`
	BloatRatio    float64 `json:"bloat_ratio"`
	WastedBytes   int64   `json:"wasted_bytes"`
	ActualSize    int64   `json:"actual_size"`
	RecommendedAction string `json:"recommended_action"`
}

// AnalyzeQueryPlan analyzes the execution plan of a query
func (opt *DatabaseOptimizer) AnalyzeQueryPlan(ctx context.Context, query string, args ...interface{}) (*QueryPlan, error) {
	start := time.Now()

	// Explain the query
	explainQuery := fmt.Sprintf("EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) %s", query)
	rows, err := opt.db.Query(ctx, explainQuery, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to explain query: %w", err)
	}
	defer rows.Close()

	var plan string
	if rows.Next() {
		if err := rows.Scan(&plan); err != nil {
			return nil, fmt.Errorf("failed to scan plan: %w", err)
		}
	}

	duration := time.Since(start)

	return &QueryPlan{
		Query:    query,
		Plan:     plan,
		Duration: duration,
	}, nil
}

// GetPerformanceMetrics retrieves current database performance metrics
func (opt *DatabaseOptimizer) GetPerformanceMetrics(ctx context.Context) (*PerformanceMetrics, error) {
	metrics := &PerformanceMetrics{}

	// Get connection pool stats
	poolStats := opt.db.Stat()
	metrics.ConnectionPoolStats = PoolStats{
		AcquiredConnections: int(poolStats.AcquiredConns()),
		ConstructingConnections: int(poolStats.ConstructingConns()),
		IdleConnections:     int(poolStats.IdleConns()),
		MaxConnections:      int(poolStats.MaxConns()),
		TotalConnections:    int(poolStats.TotalConns()),
	}

	// Get slow queries (queries running longer than 1 second)
	slowQueries, err := opt.getSlowQueries(ctx)
	if err != nil {
		log.Printf("Failed to get slow queries: %v", err)
	}
	metrics.SlowQueries = slowQueries

	// Get cache hit rate
	cacheHitRate, err := opt.getCacheHitRate(ctx)
	if err != nil {
		log.Printf("Failed to get cache hit rate: %v", err)
	}
	metrics.CacheHitRate = cacheHitRate

	// Get index usage
	indexUsage, err := opt.getIndexUsage(ctx)
	if err != nil {
		log.Printf("Failed to get index usage: %v", err)
	}
	metrics.IndexUsage = indexUsage

	// Get table bloat information
	tableBloat, err := opt.getTableBloat(ctx)
	if err != nil {
		log.Printf("Failed to get table bloat: %v", err)
	}
	metrics.TableBloat = tableBloat

	return metrics, nil
}

// OptimizeConnectionPool configures optimal connection pool settings
func (opt *DatabaseOptimizer) OptimizeConnectionPool(ctx context.Context, maxConns int) error {
	// Set connection pool configuration
	config := opt.db.Config()
	config.MaxConns = int32(maxConns)
	config.MinConns = int32(maxConns / 4) // 25% of max connections
	config.MaxConnLifetime = 1 * time.Hour
	config.MaxConnIdleTime = 30 * time.Minute

	// Close existing pool and create new one with optimized settings
	opt.db.Close()

	newPool, err := pgxpool.NewWithConfig(ctx, config)
	if err != nil {
		return fmt.Errorf("failed to create optimized pool: %w", err)
	}

	opt.db = newPool
	return nil
}

// CreateOptimizedIndexes creates indexes based on query analysis
func (opt *DatabaseOptimizer) CreateOptimizedIndexes(ctx context.Context, tableName string, columns []string) error {
	for _, column := range columns {
		indexName := fmt.Sprintf("idx_%s_%s", tableName, column)
		query := fmt.Sprintf("CREATE INDEX CONCURRENTLY IF NOT EXISTS %s ON %s (%s)", indexName, tableName, column)

		_, err := opt.db.Exec(ctx, query)
		if err != nil {
			log.Printf("Failed to create index %s: %v", indexName, err)
			continue
		}

		log.Printf("Created index: %s", indexName)
	}

	return nil
}

// AnalyzeAndOptimizeTable performs table analysis and optimization
func (opt *DatabaseOptimizer) AnalyzeAndOptimizeTable(ctx context.Context, tableName string) error {
	// Analyze table statistics
	_, err := opt.db.Exec(ctx, fmt.Sprintf("ANALYZE %s", tableName))
	if err != nil {
		return fmt.Errorf("failed to analyze table %s: %w", tableName, err)
	}

	// Check for table bloat and recommend VACUUM if needed
	bloat, err := opt.getTableBloatForTable(ctx, tableName)
	if err != nil {
		log.Printf("Failed to get bloat for table %s: %v", tableName, err)
	} else if bloat.BloatRatio > 0.2 { // More than 20% bloat
		log.Printf("Table %s has %.2f%% bloat, consider VACUUM FULL", tableName, bloat.BloatRatio*100)
	}

	return nil
}

// EnableQueryLogging enables query logging for performance analysis
func (opt *DatabaseOptimizer) EnableQueryLogging(ctx context.Context, slowQueryThreshold time.Duration) error {
	queries := []string{
		fmt.Sprintf("SET log_min_duration_statement = '%dms'", int(slowQueryThreshold.Milliseconds())),
		"SET log_statement = 'all'",
		"SET log_line_prefix = '%t [%p-%l] %q%u@%d '",
	}

	for _, query := range queries {
		_, err := opt.db.Exec(ctx, query)
		if err != nil {
			return fmt.Errorf("failed to set logging parameter: %w", err)
		}
	}

	return nil
}

// OptimizeQueryTimeout sets statement timeout for queries
func (opt *DatabaseOptimizer) OptimizeQueryTimeout(ctx context.Context, timeout time.Duration) error {
	query := fmt.Sprintf("SET statement_timeout = '%dms'", int(timeout.Milliseconds()))
	_, err := opt.db.Exec(ctx, query)
	if err != nil {
		return fmt.Errorf("failed to set statement timeout: %w", err)
	}

	return nil
}

// Helper methods
func (opt *DatabaseOptimizer) getSlowQueries(ctx context.Context) ([]string, error) {
	query := `
		SELECT query, duration
		FROM pg_stat_activity
		WHERE state = 'active'
		AND now() - query_start > interval '1 second'
		ORDER BY duration DESC
		LIMIT 10
	`

	rows, err := opt.db.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var slowQueries []string
	for rows.Next() {
		var query string
		var duration time.Duration
		if err := rows.Scan(&query, &duration); err != nil {
			continue
		}
		slowQueries = append(slowQueries, fmt.Sprintf("%s (Duration: %v)", query, duration))
	}

	return slowQueries, nil
}

func (opt *DatabaseOptimizer) getCacheHitRate(ctx context.Context) (float64, error) {
	query := `
		SELECT
			round(
				(sum(heap_blks_hit) - sum(heap_blks_read)) / sum(heap_blks_hit + heap_blks_read) * 100,
				2
			) as cache_hit_rate
		FROM pg_statio_user_tables
	`

	var cacheHitRate sql.NullFloat64
	err := opt.db.QueryRow(ctx, query).Scan(&cacheHitRate)
	if err != nil {
		return 0, err
	}

	if cacheHitRate.Valid {
		return cacheHitRate.Float64, nil
	}

	return 0, nil
}

func (opt *DatabaseOptimizer) getIndexUsage(ctx context.Context) ([]IndexUsage, error) {
	query := `
		SELECT
			t.relname as table_name,
			i.relname as index_name,
			pg_size_pretty(pg_relation_size(i.oid)) as size,
			pg_relation_size(i.oid) as size_bytes,
			coalesce(idx_scan, 0) as scan_count,
			CASE WHEN coalesce(idx_scan, 0) > 0 THEN true ELSE false END as is_used
		FROM pg_class t
		JOIN pg_index ix ON t.oid = ix.indrelid
		JOIN pg_class i ON i.oid = ix.indexrelid
		LEFT JOIN pg_stat_user_indexes ui ON ui.indexrelid = i.oid
		WHERE t.relkind = 'r'
		AND t.relname NOT LIKE 'pg_%'
		ORDER BY pg_relation_size(i.oid) DESC
	`

	rows, err := opt.db.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var indexes []IndexUsage
	for rows.Next() {
		var idx IndexUsage
		var size string
		if err := rows.Scan(&idx.TableName, &idx.IndexName, &size, &idx.SizeBytes, &idx.ScanCount, &idx.IsUsed); err != nil {
			continue
		}
		indexes = append(indexes, idx)
	}

	return indexes, nil
}

func (opt *DatabaseOptimizer) getTableBloat(ctx context.Context) ([]TableBloat, error) {
	query := `
		SELECT
			schemaname,
			tablename,
			attname,
			n_distinct,
			correlation
		FROM pg_stats
		WHERE schemaname = 'public'
		ORDER BY n_distinct DESC
		LIMIT 10
	`

	rows, err := opt.db.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var bloat []TableBloat
	for rows.Next() {
		var tb TableBloat
		if err := rows.Scan(&tb.TableName, &tb.BloatRatio, &tb.WastedBytes, &tb.ActualSize); err != nil {
			continue
		}
		bloat = append(bloat, tb)
	}

	return bloat, nil
}

func (opt *DatabaseOptimizer) getTableBloatForTable(ctx context.Context, tableName string) (*TableBloat, error) {
	query := `
		SELECT
			tablename,
			0.0 as bloat_ratio,
			0 as wasted_bytes,
			pg_total_relation_size(tablename::regclass) as actual_size
		FROM pg_tables
		WHERE tablename = $1
	`

	var tb TableBloat
	err := opt.db.QueryRow(ctx, query, tableName).Scan(&tb.TableName, &tb.BloatRatio, &tb.WastedBytes, &tb.ActualSize)
	if err != nil {
		return nil, err
	}

	return &tb, nil
}