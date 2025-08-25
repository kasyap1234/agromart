package main

import (
	"context"
	cryptorand "crypto/rand"
	"crypto/rsa"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"os"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/google/uuid"
	"agromart2/apps/server/config"
	"agromart2/internal/database"
	appsdatabase "agromart2/apps/server/internal/database"
	"agromart2/internal/auth"
	"agromart2/db"
)

// PerformanceTestResults holds the results of performance tests
type PerformanceTestResults struct {
	TotalRequests      int64         `json:"total_requests"`
	SuccessfulRequests int64         `json:"successful_requests"`
	FailedRequests     int64         `json:"failed_requests"`
	AverageResponseTime time.Duration `json:"average_response_time"`
	MinResponseTime    time.Duration `json:"min_response_time"`
	MaxResponseTime    time.Duration `json:"max_response_time"`
	RequestsPerSecond  float64       `json:"requests_per_second"`
	ErrorRate          float64       `json:"error_rate"`
	MemoryUsage        int64         `json:"memory_usage"`
	CPUUsage           float64       `json:"cpu_usage"`
	StartTime          time.Time     `json:"start_time"`
	EndTime            time.Time     `json:"end_time"`
	Duration           time.Duration `json:"duration"`
}

// PerformanceTester provides comprehensive performance testing capabilities
type PerformanceTester struct {
	baseURL    string
	httpClient *http.Client
	jwtToken   string
	config     *config.Config
	optimizer  *appsdatabase.DatabaseOptimizer
	queries    *db.Queries
}

// NewPerformanceTester creates a new performance tester instance
func NewPerformanceTester(baseURL string) (*PerformanceTester, error) {
	cfg, err := config.LoadConfig()
	if err != nil {
		return nil, fmt.Errorf("failed to load config: %w", err)
	}

	// Create HTTP client with optimized settings
	client := &http.Client{
		Timeout: 30 * time.Second,
		Transport: &http.Transport{
			MaxIdleConns:        1000,
			MaxIdleConnsPerHost: 100,
			IdleConnTimeout:     90 * time.Second,
		},
	}

	// Initialize database optimizer
	dbConfig := &database.Config{
		Host:              cfg.DB_Host,
		Port:              cfg.DB_Port,
		User:              cfg.DB_User,
		Password:          cfg.DB_Password,
		Database:          cfg.DB_Name,
		SSLMode:           "disable",
		MaxConns:          int32(cfg.MaxConns),
		MinConns:          int32(cfg.MinConns),
		MaxConnLifetime:   cfg.MaxConnLifeTime,
		MaxConnIdleTime:   cfg.MaxConnIdleTime,
		HealthCheckPeriod: cfg.HealthCheckPeriod,
	}

	pool, err := dbConfig.NewPool(context.Background())
	if err != nil {
		return nil, fmt.Errorf("failed to create database pool: %w", err)
	}

	optimizer := appsdatabase.NewDatabaseOptimizer(pool)
	wrapper := database.NewPgxWrapper(pool)
	queries := db.New(wrapper)

	return &PerformanceTester{
		baseURL:    baseURL,
		httpClient: client,
		config:     cfg,
		optimizer:  optimizer,
		queries:    queries,
	}, nil
}

// Authenticate generates a JWT token for testing
func (pt *PerformanceTester) Authenticate() error {
	// Generate test user credentials
	privateKey, err := rsa.GenerateKey(cryptorand.Reader, 2048)
	if err != nil {
		return fmt.Errorf("failed to generate private key: %w", err)
	}

	publicKey := &privateKey.PublicKey
	_ = publicKey // Mark as used to avoid compiler warning

	// Create JWT service
	jwtService := auth.NewJWTService(pt.config.JWTSecret)

	// Generate test token with all required parameters
	token, err := jwtService.GenerateToken("test-user-id", "test-tenant-id", "test@example.com", "admin", "127.0.0.1", "performance-test")
	if err != nil {
		return fmt.Errorf("failed to generate token: %w", err)
	}

	pt.jwtToken = token
	return nil
}

// RunLoadTest performs comprehensive load testing
func (pt *PerformanceTester) RunLoadTest(concurrentUsers int, duration time.Duration, rampUp time.Duration) (*PerformanceTestResults, error) {
	log.Printf("Starting load test with %d concurrent users for %v", concurrentUsers, duration)

	results := &PerformanceTestResults{
		StartTime: time.Now(),
	}

	var wg sync.WaitGroup
	var requestCount int64
	var successCount int64
	var errorCount int64
	var totalResponseTime int64
	var minResponseTime int64 = int64(time.Hour)
	var maxResponseTime int64

	// Create channels for coordination
	userStart := make(chan struct{})
	testComplete := make(chan struct{})

	// Start users gradually (ramp up)
	for i := 0; i < concurrentUsers; i++ {
		wg.Add(1)
		go func(userID int) {
			defer wg.Done()

			// Wait for start signal
			<-userStart

			// Calculate user duration (staggered end times)
			userDuration := duration + time.Duration(rand.Intn(int(duration/4)))
			endTime := time.Now().Add(userDuration)

			for time.Now().Before(endTime) {
				start := time.Now()
				err := pt.makeTestRequest(userID)
				duration := time.Since(start)

				atomic.AddInt64(&requestCount, 1)
				atomic.AddInt64(&totalResponseTime, int64(duration))

				if duration < time.Duration(atomic.LoadInt64(&minResponseTime)) {
					atomic.StoreInt64(&minResponseTime, int64(duration))
				}
				if duration > time.Duration(atomic.LoadInt64(&maxResponseTime)) {
					atomic.StoreInt64(&maxResponseTime, int64(duration))
				}

				if err != nil {
					atomic.AddInt64(&errorCount, 1)
				} else {
					atomic.AddInt64(&successCount, 1)
				}

				// Random delay between requests (50-200ms)
				time.Sleep(time.Duration(50+rand.Intn(150)) * time.Millisecond)
			}
		}(i)

		// Ramp up delay
		if i < concurrentUsers-1 {
			time.Sleep(rampUp / time.Duration(concurrentUsers))
		}
	}

	// Start the test
	close(userStart)

	// Monitor progress
	ticker := time.NewTicker(10 * time.Second)
	defer ticker.Stop()

	go func() {
		for range ticker.C {
			currentReq := atomic.LoadInt64(&requestCount)
			currentSuccess := atomic.LoadInt64(&successCount)
			log.Printf("Progress: %d requests, %d successful, %.2f%% success rate",
				currentReq, currentSuccess, float64(currentSuccess)/float64(currentReq)*100)
		}
	}()

	// Wait for test duration
	time.Sleep(duration)
	close(testComplete)

	// Wait for all users to complete
	wg.Wait()

	// Calculate final results
	endTime := time.Now()
	totalDuration := endTime.Sub(results.StartTime)

	results.EndTime = endTime
	results.Duration = totalDuration
	results.TotalRequests = requestCount
	results.SuccessfulRequests = successCount
	results.FailedRequests = errorCount

	if requestCount > 0 {
		results.AverageResponseTime = time.Duration(totalResponseTime / requestCount)
		results.ErrorRate = float64(errorCount) / float64(requestCount)
		results.RequestsPerSecond = float64(requestCount) / totalDuration.Seconds()
	}

	results.MinResponseTime = time.Duration(minResponseTime)
	results.MaxResponseTime = time.Duration(maxResponseTime)

	return results, nil
}

// makeTestRequest simulates a realistic API request
func (pt *PerformanceTester) makeTestRequest(userID int) error {
	endpoints := []string{
		"/api/health",
		"/api/products",
		"/api/inventory",
		"/api/dashboard",
		"/api/reports/low-stock",
		"/api/reports/expiring-batches",
	}

	endpoint := endpoints[rand.Intn(len(endpoints))]

	url := pt.baseURL + endpoint
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return err
	}

	// Add authentication header
	if pt.jwtToken != "" {
		req.Header.Set("Authorization", "Bearer "+pt.jwtToken)
	}

	// Add some query parameters for variety
	if endpoint == "/api/products" || endpoint == "/api/inventory" {
		req.URL.RawQuery = fmt.Sprintf("limit=%d&offset=%d", 10+rand.Intn(50), rand.Intn(1000))
	}

	resp, err := pt.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return fmt.Errorf("HTTP error: %d", resp.StatusCode)
	}

	return nil
}

// RunDatabaseStressTest tests database performance under load
func (pt *PerformanceTester) RunDatabaseStressTest(concurrentQueries int, duration time.Duration) error {
	log.Printf("Starting database stress test with %d concurrent queries for %v", concurrentQueries, duration)

	var wg sync.WaitGroup
	endTime := time.Now().Add(duration)

	for i := 0; i < concurrentQueries; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()

			for time.Now().Before(endTime) {
				// Run random database queries
				ctx := context.Background()

				start := time.Now()
				_, err := pt.queries.ListProducts(ctx, db.ListProductsParams{
					TenantID: uuid.New(),
					Limit:    10,
					Offset:   0,
				})
				duration := time.Since(start)

				if err != nil {
					log.Printf("Database query error: %v", err)
				} else if duration > 1*time.Second {
					log.Printf("Slow query detected: %v", duration)
				}

				time.Sleep(time.Duration(10+rand.Intn(50)) * time.Millisecond)
			}
		}()
	}

	wg.Wait()
	return nil
}

// GeneratePerformanceReport creates a comprehensive performance report
func (pt *PerformanceTester) GeneratePerformanceReport(results *PerformanceTestResults) {
	fmt.Println("\n" + strings.Repeat("=", 80))
	fmt.Println("PERFORMANCE TEST RESULTS")
	fmt.Println(strings.Repeat("=", 80))

	fmt.Printf("Test Duration: %v\n", results.Duration)
	fmt.Printf("Total Requests: %d\n", results.TotalRequests)
	fmt.Printf("Successful Requests: %d\n", results.SuccessfulRequests)
	fmt.Printf("Failed Requests: %d\n", results.FailedRequests)
	fmt.Printf("Success Rate: %.2f%%\n", (float64(results.SuccessfulRequests)/float64(results.TotalRequests))*100)
	fmt.Printf("Error Rate: %.2f%%\n", results.ErrorRate*100)

	fmt.Printf("\nResponse Times:\n")
	fmt.Printf("  Average: %v\n", results.AverageResponseTime)
	fmt.Printf("  Minimum: %v\n", results.MinResponseTime)
	fmt.Printf("  Maximum: %v\n", results.MaxResponseTime)

	fmt.Printf("\nThroughput:\n")
	fmt.Printf("  Requests/Second: %.2f\n", results.RequestsPerSecond)

	fmt.Println("\n" + strings.Repeat("=", 80))

	// Performance thresholds
	if results.ErrorRate > 0.05 {
		fmt.Printf("⚠️  WARNING: High error rate (%.2f%%)\n", results.ErrorRate*100)
	}

	if results.AverageResponseTime > 500*time.Millisecond {
		fmt.Printf("⚠️  WARNING: High average response time (%v)\n", results.AverageResponseTime)
	}

	if results.RequestsPerSecond < 100 {
		fmt.Printf("⚠️  WARNING: Low throughput (%.2f req/sec)\n", results.RequestsPerSecond)
	}
}

func main() {
	if len(os.Args) < 2 {
		fmt.Println("Usage: go run performance_test.go <base_url> [concurrent_users] [duration_seconds] [ramp_up_seconds]")
		fmt.Println("Example: go run performance_test.go http://localhost:8080 50 60 10")
		os.Exit(1)
	}

	baseURL := os.Args[1]
	concurrentUsers := 10
	durationSeconds := 30
	rampUpSeconds := 5

	if len(os.Args) > 2 {
		concurrentUsers, _ = strconv.Atoi(os.Args[2])
	}
	if len(os.Args) > 3 {
		durationSeconds, _ = strconv.Atoi(os.Args[3])
	}
	if len(os.Args) > 4 {
		rampUpSeconds, _ = strconv.Atoi(os.Args[4])
	}

	// Initialize performance tester
	tester, err := NewPerformanceTester(baseURL)
	if err != nil {
		log.Fatalf("Failed to initialize performance tester: %v", err)
	}

	// Authenticate
	if err := tester.Authenticate(); err != nil {
		log.Printf("Warning: Authentication failed: %v", err)
	}

	// Run load test
	results, err := tester.RunLoadTest(
		concurrentUsers,
		time.Duration(durationSeconds)*time.Second,
		time.Duration(rampUpSeconds)*time.Second,
	)
	if err != nil {
		log.Fatalf("Load test failed: %v", err)
	}

	// Generate report
	tester.GeneratePerformanceReport(results)

	// Run database stress test
	fmt.Println("\nRunning database stress test...")
	if err := tester.RunDatabaseStressTest(concurrentUsers/2, time.Duration(durationSeconds/2)*time.Second); err != nil {
		log.Printf("Database stress test failed: %v", err)
	}

	fmt.Println("Performance testing completed!")
}