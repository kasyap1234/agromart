package integration

import (
	"bufio"
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"agromart2/apps/server/config"
	"agromart2/apps/server/customers"
	"agromart2/apps/server/handler"
	"agromart2/apps/server/inventory"
	"agromart2/apps/server/products"
	"agromart2/apps/server/purchase_orders"
	"agromart2/apps/server/sales"
	"agromart2/db"
	"agromart2/internal/auth"
	"agromart2/internal/database"

	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
	echomw "github.com/labstack/echo/v4/middleware"
)

// buildServer constructs the real router similarly to cmd/api/main.go for integration tests.
func buildServer(t *testing.T) (*echo.Echo, *auth.JWTService, *db.Queries) {
	t.Helper()

	// Load config (should be pointed to test DB by docker-compose.test.yml env)
	cfg, err := config.LoadConfig()
	if err != nil {
		t.Fatalf("failed to load config: %v", err)
	}

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

	ctx := context.Background()
	pool, err := dbConfig.NewPool(ctx)
	if err != nil {
		t.Fatalf("failed to create db pool: %v", err)
	}
	t.Cleanup(func() { pool.Close() })

	queries := db.New(pool)
	jwtService := auth.NewJWTService(cfg.JWTSecret)

	// Services
	authService := auth.NewAuthService(pool, queries, jwtService)
	productService := products.NewProductService(pool, queries)
	inventoryService := inventory.NewService(pool, queries)
	customerService := customers.NewCustomerService(pool, queries)
	purchaseOrderService := purchase_orders.NewPurchaseOrderService(pool, queries)
	salesService := sales.NewService(pool, queries)

	// Handlers
	authHandler := handler.NewAuthHandler(authService)
	productHandler := products.NewProductHandler(productService)
	inventoryHandler := inventory.NewHandler(inventoryService)
	customerHandler := customers.NewCustomerHandler(customerService)
	purchaseOrderHandler := purchase_orders.NewHandler(purchaseOrderService)
	salesHandler := sales.NewHandler(salesService)

	// Middleware
	authMiddleware := auth.NewMiddleware(authService)

	// Echo
	e := echo.New()
	e.Use(echomw.Logger())
	e.Use(echomw.Recover())
	e.Use(echomw.CORS())

	// Routes
	authHandler.RegisterRoutes(e)
	api := e.Group("/api")
	protected := api.Group("")
	protected.Use(authMiddleware.RequireAuth)
	authHandler.RegisterProtectedRoutes(protected)
	productHandler.RegisterRoutes(protected)
	inventoryHandler.RegisterRoutes(protected)
	customerHandler.RegisterRoutes(protected)
	purchaseOrderHandler.RegisterRoutes(protected)
	salesHandler.RegisterRoutes(protected)

	return e, jwtService, queries
}

// seedSalesBasic inserts minimal rows to make sales report non-empty if desired.
// For this test we only need endpoint + RBAC headers, so data may be empty; still verify CSV headers.
func seedSalesBasic(t *testing.T, q *db.Queries, tenantID uuid.UUID) {
	// No-op for now; CSV header assertions do not require data.
	_ = t
	_ = q
	_ = tenantID
}

func makeJWT(t *testing.T, jwtService *auth.JWTService, userID, tenantID, email, role string) string {
	t.Helper()
	token, err := jwtService.GenerateToken(userID, tenantID, email, role)
	if err != nil {
		t.Fatalf("failed to generate token: %v", err)
	}
	return token
}

func readCSVHeader(body string) []string {
	reader := bufio.NewReader(strings.NewReader(body))
	line, _ := reader.ReadString('\n')
	line = strings.TrimSpace(line)
	if line == "" {
		return nil
	}
	parts := strings.Split(line, ",")
	for i := range parts {
		parts[i] = strings.TrimSpace(parts[i])
	}
	return parts
}

func TestSalesOrdersCSV_RBACAndHeader(t *testing.T) {
	e, jwtService, q := buildServer(t)

	tenantID := uuid.New()
	seedSalesBasic(t, q, tenantID)

	tests := []struct {
		name           string
		role           string
		wantStatus     int
		wantFirstRow   []string
	}{
		{
			name:         "admin allowed",
			role:         "admin",
			wantStatus:   http.StatusOK,
			wantFirstRow: []string{"product_name", "total_units_sold", "total_revenue"},
		},
		{
			name:         "manager allowed",
			role:         "manager",
			wantStatus:   http.StatusOK,
			wantFirstRow: []string{"product_name", "total_units_sold", "total_revenue"},
		},
		{
			name:         "staff forbidden",
			role:         "staff",
			wantStatus:   http.StatusForbidden,
			wantFirstRow: nil,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			token := makeJWT(t, jwtService, uuid.NewString(), tenantID.String(), "user@example.com", tt.role)
			req := httptest.NewRequest(http.MethodGet, "/api/sales/orders.csv?from="+time.Now().AddDate(0, 0, -30).Format("2006-01-02")+"&to="+time.Now().Format("2006-01-02"), nil)
			req.Header.Set("Authorization", "Bearer "+token)
			rec := httptest.NewRecorder()

			e.ServeHTTP(rec, req)

			if rec.Code != tt.wantStatus {
				t.Fatalf("status: got %d want %d body=%s", rec.Code, tt.wantStatus, rec.Body.String())
			}
			if tt.wantFirstRow != nil {
				header := readCSVHeader(rec.Body.String())
				if len(header) != len(tt.wantFirstRow) {
					t.Fatalf("csv header len: got %d want %d header=%v", len(header), len(tt.wantFirstRow), header)
				}
				for i := range header {
					if header[i] != tt.wantFirstRow[i] {
						t.Fatalf("csv header col %d: got %q want %q header=%v", i, header[i], tt.wantFirstRow[i], header)
					}
				}
			}
		})
	}
}

func TestPurchaseOrdersCSV_RBACAndHeader(t *testing.T) {
	e, jwtService, _ := buildServer(t)

	tenantID := uuid.New()

	tests := []struct {
		name           string
		role           string
		wantStatus     int
		wantFirstRow   []string
	}{
		{
			name:         "admin allowed",
			role:         "admin",
			wantStatus:   http.StatusOK,
			wantFirstRow: []string{"supplier_name", "total_purchased_amount", "total_orders"},
		},
		{
			name:         "manager allowed",
			role:         "manager",
			wantStatus:   http.StatusOK,
			wantFirstRow: []string{"supplier_name", "total_purchased_amount", "total_orders"},
		},
		{
			name:         "staff forbidden",
			role:         "staff",
			wantStatus:   http.StatusForbidden,
			wantFirstRow: nil,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			token := makeJWT(t, jwtService, uuid.NewString(), tenantID.String(), "user@example.com", tt.role)
			req := httptest.NewRequest(http.MethodGet, "/api/purchase-orders.csv?from="+time.Now().AddDate(0, 0, -30).Format("2006-01-02")+"&to="+time.Now().Format("2006-01-02"), nil)
			req.Header.Set("Authorization", "Bearer "+token)
			rec := httptest.NewRecorder()

			e.ServeHTTP(rec, req)

			if rec.Code != tt.wantStatus {
				t.Fatalf("status: got %d want %d body=%s", rec.Code, tt.wantStatus, rec.Body.String())
			}
			if tt.wantFirstRow != nil {
				header := readCSVHeader(rec.Body.String())
				if len(header) != len(tt.wantFirstRow) {
					t.Fatalf("csv header len: got %d want %d header=%v", len(header), len(tt.wantFirstRow), header)
				}
				for i := range header {
					if header[i] != tt.wantFirstRow[i] {
						t.Fatalf("csv header col %d: got %q want %q header=%v", i, header[i], tt.wantFirstRow[i], header)
					}
				}
			}
		})
	}
}