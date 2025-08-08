package main

import (
	"context"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	"agromart2/apps/server/config"
	"agromart2/apps/server/customers"
	"agromart2/apps/server/handler"
	"agromart2/apps/server/inventory"
	"agromart2/apps/server/products"
	"agromart2/apps/server/purchase_orders"
	"agromart2/apps/server/sales"
	"agromart2/apps/server/suppliers"
	"agromart2/db"
	"agromart2/internal/auth"
	"agromart2/internal/database"
	"agromart2/internal/utils"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	"github.com/rs/zerolog/log"
	echoSwagger "github.com/swaggo/echo-swagger"
	"golang.org/x/crypto/bcrypt"
	"golang.org/x/time/rate"
)

/*
@title AgroMart API
@version 1.0
@description API documentation for AgroMart backend services.
@BasePath /api
*/
func main() {
	// Initialize logger
	// logger.InitLogger()

	conf, err := config.LoadConfig()
	if err != nil {
		log.Fatal().Err(err).Msg("failed to load config")
	}

	// Initialize database configuration
	dbConfig := &database.Config{
		Host:              conf.DB_Host,
		Port:              conf.DB_Port,
		User:              conf.DB_User,
		Password:          conf.DB_Password,
		Database:          conf.DB_Name,
		SSLMode:           "disable",
		MaxConns:          int32(conf.MaxConns),
		MinConns:          int32(conf.MinConns),
		MaxConnLifetime:   conf.MaxConnLifeTime,
		MaxConnIdleTime:   conf.MaxConnIdleTime,
		HealthCheckPeriod: conf.HealthCheckPeriod,
	}

	if err := dbConfig.Validate(); err != nil {
		log.Fatal().Err(err).Msg("invalid database configuration")
	}

	ctx := context.Background()
	dbPool, err := dbConfig.NewPool(ctx)
	if err != nil {
		log.Fatal().Err(err).Msg("failed to create database connection pool")
	}
	defer dbPool.Close()

	// Initialize database service
	dbService := database.New(dbPool)

	// Test database health
	if err := dbService.Health(ctx); err != nil {
		log.Fatal().Err(err).Msg("database health check failed")
	}

	// Initialize queries
	queries := db.New(dbPool)

	// Initialize JWT service
	jwtService := auth.NewJWTService(conf.JWTSecret)

	// Optional: Dev seeding when SEED_DEV=true
	if os.Getenv("SEED_DEV") == "true" {
		seedCtx, cancel := context.WithTimeout(ctx, 30*time.Second)
		defer cancel()
		if err := seedDevData(seedCtx, dbPool, queries, jwtService); err != nil {
			log.Error().Err(err).Msg("dev seeding failed")
		} else {
			log.Info().Msg("dev seeding completed")
		}
	}

	// Initialize services
	authService := auth.NewAuthService(dbPool, queries, jwtService)
	productService := products.NewProductService(dbPool, queries)
	inventoryService := inventory.NewService(dbPool, queries)
	supplierService := suppliers.NewSupplierService(dbPool, queries)
	customerService := customers.NewCustomerService(dbPool, queries)
	purchaseOrderService := purchase_orders.NewPurchaseOrderService(dbPool, queries)
	salesService := sales.NewService(dbPool, queries)

	// Initialize handlers
	authHandler := handler.NewAuthHandler(authService)
	productHandler := products.NewProductHandler(productService)
	inventoryHandler := inventory.NewHandler(inventoryService)
	supplierHandler := suppliers.NewHandler(supplierService)
	customerHandler := customers.NewCustomerHandler(customerService)
	purchaseOrderHandler := purchase_orders.NewHandler(purchaseOrderService)
	salesHandler := sales.NewHandler(salesService)
	healthHandler := handler.NewHealthHandler(dbService)

	// Initialize middleware
	authMiddleware := auth.NewMiddleware(authService)

	// Setup Echo server
	e := echo.New()

	// Add global middleware
	e.Use(middleware.Logger())
	e.Use(middleware.Recover())
	e.Use(middleware.CORSWithConfig(middleware.CORSConfig{
		AllowOrigins:     []string{"*"},
		AllowMethods:     []string{http.MethodGet, http.MethodPost, http.MethodPut, http.MethodPatch, http.MethodDelete, http.MethodOptions},
		AllowHeaders:     []string{"*"},
		AllowCredentials: true,
	}))

	// CORS configuration (polished):
	// - Allow all origins in dev (APP_ENV empty/development/local)
	// - In prod, allow NEXT_PUBLIC_SITE_URL and optional CORS_EXTRA_ORIGINS (comma-separated)
	allowAll := os.Getenv("APP_ENV") == "" || os.Getenv("APP_ENV") == "development" || os.Getenv("APP_ENV") == "local"
	if allowAll {
		e.Use(middleware.CORSWithConfig(middleware.CORSConfig{
			AllowOrigins:     []string{"*"},
			AllowMethods:     []string{http.MethodGet, http.MethodPost, http.MethodPut, http.MethodPatch, http.MethodDelete, http.MethodOptions},
			AllowHeaders:     []string{"Authorization", "Content-Type"},
			AllowCredentials: true,
			MaxAge:           300,
		}))
	} else {
		origins := []string{}
		if o := os.Getenv("NEXT_PUBLIC_SITE_URL"); o != "" {
			origins = append(origins, o)
		}
		if extra := os.Getenv("CORS_EXTRA_ORIGINS"); extra != "" {
			// simple split without importing strings: manual parse by comma
			part := []rune(extra)
			start := 0
			for i := 0; i <= len(part); i++ {
				if i == len(part) || part[i] == ',' {
					seg := string(part[start:i])
					// trim spaces
					segRunes := []rune(seg)
					li, rj := 0, len(segRunes)-1
					for li <= rj && (segRunes[li] == ' ' || segRunes[li] == '\t' || segRunes[li] == '\n' || segRunes[li] == '\r') {
						li++
					}
					for rj >= li && (segRunes[rj] == ' ' || segRunes[rj] == '\t' || segRunes[rj] == '\n' || segRunes[rj] == '\r') {
						rj--
					}
					if li <= rj {
						origins = append(origins, string(segRunes[li:rj+1]))
					}
					start = i + 1
				}
			}
		}
		if len(origins) == 0 {
			origins = []string{"https://example.com"}
		}
		e.Use(middleware.CORSWithConfig(middleware.CORSConfig{
			AllowOrigins:     origins,
			AllowMethods:     []string{http.MethodGet, http.MethodPost, http.MethodPut, http.MethodPatch, http.MethodDelete, http.MethodOptions},
			AllowHeaders:     []string{"Authorization", "Content-Type"},
			ExposeHeaders:    []string{"X-RateLimit-Limit", "X-RateLimit-Remaining", "X-RateLimit-Reset"},
			AllowCredentials: true,
			MaxAge:           600,
		}))
	}

	// Global rate limiter: 200 requests per minute per IP
	// Keep default store for global; headers added only for endpoint-specific limiters
	e.Use(middleware.RateLimiter(middleware.NewRateLimiterMemoryStore(200)))

	// Setup health check routes
	healthHandler.RegisterRoutes(e)

	// Setup public auth routes with stricter rate limiting (30 rpm per IP baseline)
	authLimiter := middleware.RateLimiter(middleware.NewRateLimiterMemoryStore(30))
	authGroup := e.Group("/api/auth", authLimiter)

	// Per-endpoint limiters with standard headers
	type limiterWrap struct {
		store middleware.RateLimiterStore
		limit int
	}
	makeLimiter := func(limitPerMinute int) (echo.MiddlewareFunc, *limiterWrap) {
		// MemoryStore config uses golang.org/x/time/rate.Limit; construct via time/rate package
		store := middleware.NewRateLimiterMemoryStoreWithConfig(middleware.RateLimiterMemoryStoreConfig{
			Rate:  rate.Limit(limitPerMinute),
			Burst: limitPerMinute,
		})
		w := &limiterWrap{store: store, limit: limitPerMinute}
		return func(next echo.HandlerFunc) echo.HandlerFunc {
			return func(c echo.Context) error {
				key := c.RealIP()
				allowed, _ := store.Allow(key)
				c.Response().Header().Set("X-RateLimit-Limit", strconv.Itoa(limitPerMinute))
				c.Response().Header().Set("X-RateLimit-Reset", strconv.FormatInt(time.Now().Add(60*time.Second).Unix(), 10))
				if !allowed {
					c.Response().Header().Set("Retry-After", "60")
					return c.JSON(http.StatusTooManyRequests, map[string]interface{}{
						"success": false,
						"error": map[string]interface{}{
							"code":    http.StatusTooManyRequests,
							"message": "too many requests",
						},
					})
				}
				return next(c)
			}
		}, w
	}

	// Endpoint-specific limits
	loginMW, _ := makeLimiter(10) // 10 rpm
	forgotMW, _ := makeLimiter(6) // 6 rpm
	resetMW, _ := makeLimiter(6)  // 6 rpm

	authGroup.POST("/register", authHandler.Register)
	authGroup.POST("/login", authHandler.Login, loginMW)
	authGroup.POST("/refresh", authHandler.RefreshToken) // keep baseline 30 rpm
	authGroup.POST("/logout", authHandler.Logout)        // keep baseline 30 rpm
	// Public password reset routes
	authGroup.POST("/password/forgot", func(c echo.Context) error { return handler.PasswordForgot(authService, c) }, forgotMW)
	authGroup.POST("/password/reset", func(c echo.Context) error { return handler.PasswordReset(authService, c) }, resetMW)

	// Setup API routes
	api := e.Group("/api")

	// Protected routes
	protected := api.Group("")
	protected.Use(authMiddleware.RequireAuth)

	// Auth protected routes
	authHandler.RegisterProtectedRoutes(protected)

	// Business logic routes with RBAC for write operations
	// Products
	{
		grp := protected.Group("")
		// Write endpoints - admin/manager
		grp.POST("/products", authMiddleware.RequireRole("admin", "manager")(productHandler.CreateProduct))
		grp.PATCH("/products/:id", authMiddleware.RequireRole("admin", "manager")(productHandler.PatchProduct))
		// Read endpoints - any authenticated
		grp.GET("/products", productHandler.ListProducts)
		grp.GET("/products/search", productHandler.SearchProducts)
		grp.GET("/products/:id", productHandler.GetProduct)
		grp.GET("/units", productHandler.ListUnits)
	}

	// Inventory (kept as-is; internal handlers may apply their own checks)
	inventoryHandler.RegisterRoutes(protected)

	// Suppliers
	{
		grp := protected.Group("")
		// Write endpoints
		grp.POST("/suppliers", authMiddleware.RequireRole("admin", "manager")(supplierHandler.CreateSupplier))
		grp.PUT("/suppliers/:id", authMiddleware.RequireRole("admin", "manager")(supplierHandler.UpdateSupplier))
		grp.DELETE("/suppliers/:id", authMiddleware.RequireRole("admin", "manager")(supplierHandler.DeleteSupplier))
		// Read endpoints
		grp.GET("/suppliers", supplierHandler.ListSuppliers)
		grp.GET("/suppliers/search", supplierHandler.SearchSuppliers)
		grp.GET("/suppliers/:id", supplierHandler.GetSupplier)
	}

	// Customers
	{
		grp := protected.Group("")
		// Write endpoints
		grp.POST("/customers", authMiddleware.RequireRole("admin", "manager")(customerHandler.CreateCustomer))
		grp.PUT("/customers/:id", authMiddleware.RequireRole("admin", "manager")(customerHandler.UpdateCustomer))
		grp.DELETE("/customers/:id", authMiddleware.RequireRole("admin", "manager")(customerHandler.DeleteCustomer))
		// Read endpoints
		grp.GET("/customers", customerHandler.ListCustomers)
		grp.GET("/customers/active", customerHandler.ListActiveCustomers)
		grp.GET("/customers/search", customerHandler.SearchCustomers)
		grp.GET("/customers/:id", customerHandler.GetCustomer)
	}

	// Purchase Orders
	{
		grp := protected.Group("")
		// Write endpoints
		grp.POST("/purchase-orders", authMiddleware.RequireRole("admin", "manager")(purchaseOrderHandler.CreatePurchaseOrder))
		grp.PUT("/purchase-orders/:id/status", authMiddleware.RequireRole("admin", "manager")(purchaseOrderHandler.UpdatePurchaseOrderStatus))
		grp.POST("/purchase-orders/:id/receive", authMiddleware.RequireRole("admin", "manager")(purchaseOrderHandler.ReceivePurchaseOrder))
		// Read endpoints
		grp.GET("/purchase-orders", purchaseOrderHandler.ListPurchaseOrders)
		grp.GET("/purchase-orders/:id", purchaseOrderHandler.GetPurchaseOrder)
		// Reports JSON (read)
		grp.GET("/reports/product-movement", purchaseOrderHandler.GetProductMovementReport)
		grp.GET("/reports/supplier-purchase-summary", purchaseOrderHandler.GetSupplierPurchaseSummary)
	}

	// Sales routes (includes /api/sales/orders.csv export with RBAC via CanExport)
	salesHandler.RegisterRoutes(protected)

	// Swagger UI at /swagger/index.html (temporarily bypass auth for debugging)
	e.GET("/swagger/*", echoSwagger.WrapHandler, func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			// Bypass authentication for Swagger UI
			return next(c)
		}
	})

	// Start server
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		log.Info().Int("port", conf.AppPort).Msg("server starting")
		if err := e.Start(":" + strconv.Itoa(conf.AppPort)); err != nil {
			log.Fatal().Err(err).Msg("server failed to start")
		}
	}()

	<-quit
	log.Info().Msg("server shutting down")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := e.Shutdown(shutdownCtx); err != nil {
		log.Fatal().Err(err).Msg("server failed to shutdown gracefully")
	}
	log.Info().Msg("server stopped")
}

// seedDevData creates demo data for development:
// - One tenant "Acme Inc"
// - Admin user admin@example.com / password
// - Units (kg, piece)
// - 5 suppliers, 10 customers
// - 5 sample products
// - Purchase orders and sales data for the last 30 days (lightweight)
func seedDevData(ctx context.Context, dbPool *pgxpool.Pool, queries *db.Queries, jwtService *auth.JWTService) error {
	// If we already have users, assume seeded
	var userCount int
	if err := dbPool.QueryRow(ctx, "SELECT COUNT(1) FROM users").Scan(&userCount); err != nil {
		return err
	}
	if userCount > 0 {
		return nil
	}

	// Create tenant
	tenant, err := queries.CreateTenant(ctx, db.CreateTenantParams{
		Name:               "Acme Inc",
		Email:              "admin@example.com",
		Phone:              "0000000000",
		Address:            utils.P.Text(""),
		RegistrationNumber: utils.P.Text(""),
	})
	if err != nil {
		return err
	}

	// Create admin user
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte("password"), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	admin, err := queries.CreateUser(ctx, db.CreateUserParams{
		Name:     "Acme Admin",
		Email:    "admin@example.com",
		Password: string(hashedPassword),
		Phone:    "0000000000",
		TenantID: tenant.ID,
		Column6:  "admin",
	})
	if err != nil {
		return err
	}
	// Validate JWT wiring (no persistence)
	_, _ = jwtService.GenerateToken(admin.ID.String(), tenant.ID.String(), admin.Email, "admin")
	_, _ = jwtService.GenerateRefreshToken(admin.ID.String())

	// Seed units
	type unitDef struct{ Name, Abbr string }
	units := []unitDef{{"Kilogram", "kg"}, {"Piece", "pc"}}
	unitIDs := make([]uuid.UUID, 0, len(units))
	for _, u := range units {
		row, err := queries.CreateUnit(ctx, db.CreateUnitParams{
			TenantID:     tenant.ID,
			Name:         u.Name,
			Abbreviation: u.Abbr,
		})
		if err != nil {
			return err
		}
		unitIDs = append(unitIDs, row.ID)
	}

	// Seed 5 suppliers
	for i := 1; i <= 5; i++ {
		_, err := queries.CreateSupplier(ctx, db.CreateSupplierParams{
			TenantID:      tenant.ID,
			Name:          "Supplier " + strconv.Itoa(i),
			ContactPerson: utils.P.Text("Contact " + strconv.Itoa(i)),
			Email:         utils.P.Text("supplier" + strconv.Itoa(i) + "@example.com"),
			Phone:         utils.P.Text("90000000" + strconv.Itoa(10+i)),
			Address:       utils.P.Text("Address " + strconv.Itoa(i)),
			TaxID:         utils.P.Text("TAX" + strconv.Itoa(1000+i)),
			PaymentMode:   utils.P.Text("bank"),
		})
		if err != nil {
			return err
		}
	}

	// Seed 10 customers (lightweight using direct SQL assuming customers table exists)
	for i := 1; i <= 10; i++ {
		// name, email, phone, address, tenant_id, is_active default true
		_, err := dbPool.Exec(ctx, `
			INSERT INTO customers (name, email, phone, address, tenant_id)
			VALUES ($1, $2, $3, $4, $5)
		`, "Customer "+strconv.Itoa(i), "customer"+strconv.Itoa(i)+"@example.com", "98000000"+strconv.Itoa(10+i), "Address "+strconv.Itoa(i), tenant.ID)
		if err != nil {
			return err
		}
	}

	// Seed 5 products
	sampleProducts := []struct {
		SKU, Name, Brand         string
		Price, PricePerUnit, GST int32
		UnitIdx                  int
	}{
		{"SKU-001", "Wheat Flour", "Acme", 450, 45, 5, 0},
		{"SKU-002", "Rice", "Acme", 600, 60, 5, 0},
		{"SKU-003", "Cooking Oil", "Acme", 1200, 120, 12, 0},
		{"SKU-004", "Sugar", "Acme", 500, 50, 5, 0},
		{"SKU-005", "Biscuits", "Acme", 100, 10, 12, 1},
	}
	productIDs := make([]uuid.UUID, 0, len(sampleProducts))
	for _, p := range sampleProducts {
		unitID := unitIDs[p.UnitIdx]
		row, err := queries.CreateProduct(ctx, db.CreateProductParams{
			TenantID:     tenant.ID,
			Sku:          p.SKU,
			Name:         p.Name,
			Price:        utils.P.Numeric(100), // Default price
			Description:  utils.P.Text(""),
			ImageUrl:     utils.P.Text(""),
			Brand:        utils.P.Text(p.Brand),
			UnitID:       unitID,
			PricePerUnit: utils.P.Numeric(10), // Default price per unit
			GstPercent:   utils.P.Numeric(5),  // Default GST
		})
		if err != nil {
			return err
		}
		productIDs = append(productIDs, row.ID)
	}

	// Seed demo purchase orders and sales over the last 30 days (aggregate inserts to keep it simple)
	now := time.Now().UTC()
	for d := 30; d >= 1; d-- {
		day := now.AddDate(0, 0, -d)

		// Simple inventory adjustment via purchase_orders tables if they exist; otherwise skip gracefully
		// Insert a lightweight row into purchase_orders and purchase_order_items if tables exist.
		// Using conditional execution to avoid breaking environments lacking these tables.
		_, _ = dbPool.Exec(ctx, `
			DO $$
			BEGIN
				IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'purchase_orders') THEN
					INSERT INTO purchase_orders (tenant_id, supplier_id, status, ordered_at)
					VALUES ($1, (SELECT id FROM suppliers WHERE tenant_id=$1 LIMIT 1), 'received', $2)
					RETURNING id INTO STRICT _poid;
				END IF;
			END
			$$ LANGUAGE plpgsql;
		`, tenant.ID, day)

		// Sales summary table might not exist; alternatively insert into a generic sales table if present
		_, _ = dbPool.Exec(ctx, `
			DO $$
			DECLARE
				_pid uuid;
			BEGIN
				IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sales_orders') THEN
					INSERT INTO sales_orders (tenant_id, customer_id, created_at)
					VALUES ($1, (SELECT id FROM customers WHERE tenant_id=$1 LIMIT 1), $2)
					RETURNING id INTO STRICT _pid;
				END IF;
			END
			$$ LANGUAGE plpgsql;
		`, tenant.ID, day)
	}

	return nil
}
