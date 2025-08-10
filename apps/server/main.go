package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"strings"
	"syscall"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	echoPprof "github.com/labstack/echo-contrib/pprof"
	echoProm "github.com/labstack/echo-contrib/prometheus"
	"github.com/labstack/echo/v4"
	echoMiddleware "github.com/labstack/echo/v4/middleware"
	echoSwagger "github.com/swaggo/echo-swagger"
	"golang.org/x/crypto/bcrypt"

	"agromart2/apps/server/config"
	"agromart2/apps/server/customers"
	"agromart2/apps/server/purchase_orders"
	"agromart2/apps/server/reports"
	"agromart2/apps/server/suppliers"
	"agromart2/internal/auth"
	"agromart2/internal/database"
	"agromart2/internal/middleware"

	"agromart2/apps/server/analytics"
	"agromart2/apps/server/batches"
	_ "agromart2/apps/server/docs"
	"agromart2/apps/server/handler"
	"agromart2/apps/server/inventory"
	"agromart2/apps/server/products"
	"agromart2/apps/server/sales"
	"agromart2/db"
)

/*
@title AgroMart API
@version 1.0
@description API documentation for AgroMart backend services.
@BasePath /api
@securityDefinitions.apikey Bearer
@in header
@name Authorization
@description Type "Bearer" followed by a space and JWT token.
*/

// Check for migrate-only flag
func runMigrationsOnly() {
	cfg, err := config.LoadConfig()
	if err != nil {
		log.Fatal("Failed to load config:", err)
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

	if err := dbConfig.Validate(); err != nil {
		log.Fatal("Invalid database config:", err)
	}

	ctx := context.Background()
	pool, err := dbConfig.NewPool(ctx)
	if err != nil {
		log.Fatal("Failed to create database connection pool:", err)
	}
	defer pool.Close()

	if err := database.RunMigrations(ctx, pool, "sql/schema"); err != nil {
		log.Fatal("Failed to run database migrations:", err)
	}

	log.Println("Migrations completed successfully")
}

// Dev seeding function
func seedDevData(ctx context.Context, dbPool *pgxpool.Pool, queries *db.Queries, jwtService *auth.JWTService) error {
	log.Println("[SEED] Starting dev data seeding...")

	// Create admin tenant first
	tenant, err := queries.CreateTenant(ctx, db.CreateTenantParams{
		Name:               "Demo Company",
		Email:              "admin@example.com",
		Phone:              "+1-555-0123",
		Address:            pgtype.Text{String: "123 Demo Street", Valid: true},
		RegistrationNumber: pgtype.Text{String: "DEMO123", Valid: true},
	})
	if err != nil {
		return err
	}

	// Check if admin user already exists
	_, err = queries.GetUserByEmail(ctx, db.GetUserByEmailParams{
		Email:    "admin@example.com",
		TenantID: tenant.ID,
	})
	if err == nil {
		log.Println("[SEED] Admin user already exists, skipping seeding")
		return nil
	}

	// Create admin user
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte("password"), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	_, err = queries.CreateUser(ctx, db.CreateUserParams{
		Name:     "Admin User",
		Email:    "admin@example.com",
		Password: string(hashedPassword),
		Phone:    "+1-555-0123",
		TenantID: tenant.ID,
		Column6:  "admin",
	})
	if err != nil {
		return err
	}

	log.Println("[SEED] Dev seeding completed successfully")
	return nil
}

func main() {
	// Check for migrate-only flag
	if len(os.Args) > 1 && os.Args[1] == "--migrate-only" {
		runMigrationsOnly()
		return
	}
	// Load configuration with diagnostics
	cfg, err := config.LoadConfig()
	if err != nil {
		log.Fatal("Failed to load config:", err)
	}
	log.Printf("[BOOT] Config loaded: env(JWT set? %t) appPort=%d db_host=%s db_port=%d maxConns=%d",
		cfg.JWTSecret != "", cfg.AppPort, cfg.DB_Host, cfg.DB_Port, cfg.MaxConns)

	// Create database config
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

	// Validate config
	if configErr := dbConfig.Validate(); configErr != nil {
		log.Fatal("Invalid database config:", configErr)
	}

	// Initialize database connection pool
	ctx := context.Background()
	start := time.Now()
	pool, err := dbConfig.NewPool(ctx)
	if err != nil {
		log.Fatal("Failed to create database connection pool:", err)
	}
	defer pool.Close()
	log.Printf("[BOOT] DB pool created in %s", time.Since(start))

	// Test database connection
	if err := pool.Ping(ctx); err != nil {
		log.Fatal("Failed to ping database:", err)
	}
	log.Printf("[BOOT] DB ping OK")

	// Run database migrations
	if err := database.RunMigrations(ctx, pool, "sql/schema"); err != nil {
		log.Fatal("Failed to run database migrations: ", err)
	}

	// Initialize SQLC queries
	queries := db.New(pool)

	// Initialize JWT service
	jwtService := auth.NewJWTService(cfg.JWTSecret)

	// Optional: Dev seeding when SEED_DEV=true
	if os.Getenv("SEED_DEV") == "true" {
		seedCtx, cancel := context.WithTimeout(ctx, 30*time.Second)
		defer cancel()
		if err := seedDevData(seedCtx, pool, queries, jwtService); err != nil {
			log.Printf("Dev seeding failed: %v", err)
		} else {
			log.Println("Dev seeding completed")
		}
	}

	// Initialize services
	authService := auth.NewAuthService(pool, queries, jwtService)
	productService := products.NewProductService(pool, queries)
	inventoryService := inventory.NewService(pool, queries)
	analyticsService := analytics.NewService(pool, queries)
	salesService := sales.NewService(pool, queries)
	batchesService := batches.NewService(pool, queries)
	supplierService := suppliers.NewSupplierService(pool, queries)
	customerService := customers.NewCustomerService(pool, queries)
	purchaseOrderService := purchase_orders.NewPurchaseOrderService(pool, queries)

	// Initialize handlers
	authHandler := handler.NewAuthHandler(authService)
	productHandler := products.NewProductHandler(productService)
	inventoryHandler := inventory.NewHandler(inventoryService)
	analyticsHandler := analytics.NewHandler(analyticsService)
	salesHandler := sales.NewHandler(salesService)
	batchesHandler := batches.NewHandler(batchesService)
	reportsHandler := reports.NewHandler(queries)
	supplierHandler := suppliers.NewHandler(supplierService)
	customerHandler := customers.NewCustomerHandler(customerService)
	purchaseOrderHandler := purchase_orders.NewHandler(purchaseOrderService)
	healthHandler := handler.NewHealthHandler(database.New(pool))

	// Initialize middleware
	authMiddleware := auth.NewMiddleware(authService)

	// Initialize Echo
	e := echo.New()

	// Middleware
	e.Use(echoMiddleware.Logger())
	// Use our custom Recover to avoid Echo's default interfering with error flow
	e.Use(middleware.RecoverMiddleware)
	e.Use(middleware.RequestIDMiddleware)
	// Use proper global HTTP error handler to preserve status codes
	e.HTTPErrorHandler = middleware.HTTPErrorHandler

	// CORS configuration - allow all origins in dev, specific origins in prod
	allowAll := os.Getenv("APP_ENV") == "" || os.Getenv("APP_ENV") == "development" || os.Getenv("APP_ENV") == "local"
	if allowAll {
		e.Use(echoMiddleware.CORSWithConfig(echoMiddleware.CORSConfig{
			AllowOrigins:     []string{"*"},
			AllowMethods:     []string{http.MethodGet, http.MethodPut, http.MethodPost, http.MethodDelete, http.MethodPatch, http.MethodOptions},
			AllowHeaders:     []string{"*"},
			AllowCredentials: true,
		}))
	} else {
		e.Use(echoMiddleware.CORSWithConfig(echoMiddleware.CORSConfig{
			AllowOrigins:     []string{"http://localhost:3000", "http://localhost:8080"},
			AllowMethods:     []string{http.MethodGet, http.MethodPut, http.MethodPost, http.MethodDelete, http.MethodPatch, http.MethodOptions},
			AllowHeaders:     []string{echo.HeaderOrigin, echo.HeaderContentType, echo.HeaderAccept, echo.HeaderAuthorization, "X-Debug-Client"},
			AllowCredentials: true,
		}))
	}

	// Dev-only instrumentation: Prometheus metrics and pprof
	{
		// Decide dev mode via environment variable to avoid depending on config struct shape
		appEnv := os.Getenv("APP_ENV")
		if appEnv == "" {
			appEnv = os.Getenv("ENV")
		}
		if appEnv == "" {
			appEnv = "development"
		}
		if appEnv == "development" || appEnv == "dev" || appEnv == "local" {
			// Register Prometheus metrics middleware and /metrics endpoint
			// Skip swagger endpoints to avoid interference
			p := echoProm.NewPrometheus("agromart_http", func(c echo.Context) bool {
				return strings.Contains(c.Request().URL.Path, "swagger")
			})
			p.Use(e)

			// Register pprof handlers at /debug/pprof/*
			echoPprof.Register(e)

			// Swagger UI with convenience redirect
			e.GET("/swagger", func(c echo.Context) error {
				return c.Redirect(http.StatusMovedPermanently, "/swagger/index.html")
			})
			e.GET("/swagger/*", echoSwagger.WrapHandler)
		}
	}

	// Health check routes
	healthHandler.RegisterRoutes(e)

	// API routes
	api := e.Group("/api")

	// IMPORTANT: Ensure public /api/health is NOT protected by group auth middleware.
	// Register it directly on the root Echo with explicit path to avoid inheriting /api group's middleware.
	e.GET("/api/health", func(c echo.Context) error {
		return c.JSON(200, map[string]interface{}{
			"service": "agromart-api",
			"status":  "ok",
		})
	})

	// Public health alias under /api to match frontend expectations
	// This must be registered before applying auth middleware to protected groups
	api.GET("/health", func(c echo.Context) error {
		return c.JSON(200, map[string]interface{}{
			"service": "agromart-api",
			"status":  "ok",
		})
	})

	// Auth routes
	authGroup := api.Group("/auth")

	authGroup.POST("/register", authHandler.Register)
	authGroup.OPTIONS("/register", func(c echo.Context) error {
		return c.NoContent(http.StatusNoContent)
	})
	authGroup.POST("/login", authHandler.Login)
	authGroup.POST("/logout", authHandler.Logout)
	authGroup.POST("/refresh", authHandler.RefreshToken)
	// Password reset basics
	authGroup.POST("/password/forgot", func(c echo.Context) error { return handler.PasswordForgot(authService, c) })
	authGroup.POST("/password/reset", func(c echo.Context) error { return handler.PasswordReset(authService, c) })

	// Protected routes
	protected := api.Group("")
	// Protect all subsequent routes in this group
	protected.Use(authMiddleware.RequireAuth)

	// Auth protected routes
	authHandler.RegisterProtectedRoutes(protected)

	// Product routes
	productGroup := protected.Group("/products")
	// Write operations (admin/manager)
	productGroup.POST("", authMiddleware.RequireRole("admin", "manager")(productHandler.CreateProduct))
	productGroup.PATCH("/:id", authMiddleware.RequireRole("admin", "manager")(productHandler.PatchProduct))
	// Read operations (all authenticated roles)
	productGroup.GET("", productHandler.ListProducts)
	productGroup.GET("/search", productHandler.SearchProducts)
	productGroup.GET("/:id", productHandler.GetProduct)
	// Units listing (read)
	productGroup.GET("/units", productHandler.ListUnits)

	// Inventory routes
	inventoryHandler.RegisterRoutes(protected)

	// Analytics routes
	analyticsHandler.RegisterRoutes(protected)

	// Sales routes
	salesHandler.RegisterRoutes(protected)

	// Batches routes
	batchesHandler.RegisterRoutes(protected)

	// Suppliers
	// Suppliers
	{
		grp := protected.Group("")
		grp.POST("/suppliers", authMiddleware.RequireRole("admin", "manager")(supplierHandler.CreateSupplier))
		grp.PUT("/suppliers/:id", authMiddleware.RequireRole("admin", "manager")(supplierHandler.UpdateSupplier))
		grp.DELETE("/suppliers/:id", authMiddleware.RequireRole("admin", "manager")(supplierHandler.DeleteSupplier))
		grp.GET("/suppliers", supplierHandler.ListSuppliers)
		grp.GET("/suppliers/search", supplierHandler.SearchSuppliers)
		grp.GET("/suppliers/:id", supplierHandler.GetSupplier)
	}

	// Customers
	{
		grp := protected.Group("")
		grp.POST("/customers", authMiddleware.RequireRole("admin", "manager")(customerHandler.CreateCustomer))
		grp.PUT("/customers/:id", authMiddleware.RequireRole("admin", "manager")(customerHandler.UpdateCustomer))
		grp.DELETE("/customers/:id", authMiddleware.RequireRole("admin", "manager")(customerHandler.DeleteCustomer))
		grp.GET("/customers", customerHandler.ListCustomers)
		grp.GET("/customers/active", customerHandler.ListActiveCustomers)
		grp.GET("/customers/search", customerHandler.SearchCustomers)
		grp.GET("/customers/:id", customerHandler.GetCustomer)
	}

	// Purchase Orders
	{
		grp := protected.Group("")
		grp.POST("/purchase-orders", authMiddleware.RequireRole("admin", "manager")(purchaseOrderHandler.CreatePurchaseOrder))
		grp.PUT("/purchase-orders/:id/status", authMiddleware.RequireRole("admin", "manager")(purchaseOrderHandler.UpdatePurchaseOrderStatus))
		grp.POST("/purchase-orders/:id/receive", authMiddleware.RequireRole("admin", "manager")(purchaseOrderHandler.ReceivePurchaseOrder))
		grp.GET("/purchase-orders", purchaseOrderHandler.ListPurchaseOrders)
		grp.GET("/purchase-orders/:id", purchaseOrderHandler.GetPurchaseOrder)
		grp.GET("/reports/product-movement", purchaseOrderHandler.GetProductMovementReport)
		grp.GET("/reports/supplier-purchase-summary", purchaseOrderHandler.GetSupplierPurchaseSummary)
	}

	// Reports routes
	reportsGroup := protected.Group("/reports")
	// Register reports handler routes
	reportsHandler.RegisterRoutes(reportsGroup)

	// Low stock with optional threshold query param (default 10)
	reportsGroup.GET("/low-stock", func(c echo.Context) error {
		tenantStr, ok := c.Get("tenant_id").(string)
		if !ok || tenantStr == "" {
			return echo.NewHTTPError(401, "invalid tenant context")
		}
		tenantUUID, parseErr := uuid.Parse(tenantStr)
		if parseErr != nil {
			return echo.NewHTTPError(401, "invalid tenant id")
		}
		threshold := 10
		if t := c.QueryParam("threshold"); t != "" {
			if v, convErr := strconv.Atoi(t); convErr == nil && v >= 0 {
				threshold = v
			}
		}
		items, err := inventoryService.GetLowStockReport(c.Request().Context(), tenantUUID, threshold)
		if err != nil {
			log.Printf("[REPORTS] low-stock error: %v", err)
			return echo.NewHTTPError(500, "failed to get low stock report")
		}
		return c.JSON(200, map[string]interface{}{
			"success": true,
			"data":    items,
		})
	})

	// Expiring batches with optional days query param (default 30)
	reportsGroup.GET("/expiring-batches", func(c echo.Context) error {
		tenantStr, ok := c.Get("tenant_id").(string)
		if !ok || tenantStr == "" {
			return echo.NewHTTPError(401, "invalid tenant context")
		}
		tenantUUID, err := uuid.Parse(tenantStr)
		if err != nil {
			return echo.NewHTTPError(401, "invalid tenant id")
		}
		days := 30
		if d := c.QueryParam("days"); d != "" {
			if v, convErr := strconv.Atoi(d); convErr == nil && v >= 0 {
				days = v
			}
		}
		items, err := inventoryService.GetExpiringBatches(c.Request().Context(), tenantUUID, days)
		if err != nil {
			log.Printf("[REPORTS] expiring-batches error: %v", err)
			return echo.NewHTTPError(500, "failed to get expiring batches")
		}
		return c.JSON(200, map[string]interface{}{
			"success": true,
			"data":    items,
		})
	})

	// Inventory total value endpoint expected by frontend
	reportsGroup.GET("/inventory-value", func(c echo.Context) error {
		tenantStr, ok := c.Get("tenant_id").(string)
		if !ok || tenantStr == "" {
			return echo.NewHTTPError(401, "invalid tenant context")
		}
		tenantUUID, err := uuid.Parse(tenantStr)
		if err != nil {
			return echo.NewHTTPError(401, "invalid tenant id")
		}
		val, err := inventoryService.GetInventoryValue(c.Request().Context(), tenantUUID)
		if err != nil {
			log.Printf("[REPORTS] inventory-value error: %v", err)
			return echo.NewHTTPError(500, "failed to get inventory value")
		}
		return c.JSON(200, map[string]interface{}{
			"success": true,
			"data":    val,
		})
	})

	// Start server with graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		port := getPort(cfg.AppPort)
		log.Printf("[BOOT] Server starting on port %s", port)
		if err := e.Start(":" + port); err != nil {
			log.Fatal("Server failed to start:", err)
		}
	}()

	<-quit
	log.Println("Server shutting down...")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := e.Shutdown(shutdownCtx); err != nil {
		log.Fatal("Server failed to shutdown gracefully:", err)
	}
	log.Println("Server stopped")
}

func getPort(defaultPort int) string {
	port := os.Getenv("PORT")
	if port == "" {
		return strconv.Itoa(defaultPort)
	}
	return port
}
