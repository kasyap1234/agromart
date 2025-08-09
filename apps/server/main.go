package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"strconv"
	"time"

	"github.com/google/uuid"
	echoPprof "github.com/labstack/echo-contrib/pprof"
	echoProm "github.com/labstack/echo-contrib/prometheus"
	"github.com/labstack/echo/v4"
	echoMiddleware "github.com/labstack/echo/v4/middleware"

	"agromart2/apps/server/config"
	"agromart2/apps/server/reports"
	"agromart2/internal/auth"
	"agromart2/internal/database"
	"agromart2/internal/middleware"

	"agromart2/apps/server/analytics"
	"agromart2/apps/server/batches"
	"agromart2/apps/server/handler"
	"agromart2/apps/server/inventory"
	"agromart2/apps/server/products"
	"agromart2/apps/server/sales"
	"agromart2/db"
)

func main() {
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
	if err := database.RunMigrations(ctx, pool, "apps/server/sql/schema"); err != nil {
		log.Fatal("Failed to run database migrations: ", err)
	}

	// Initialize SQLC queries
	queries := db.New(pool)

	// Initialize services
	jwtService := auth.NewJWTService(cfg.JWTSecret)
	authService := auth.NewAuthService(pool, queries, jwtService)
	productService := products.NewProductService(pool, queries)
	inventoryService := inventory.NewService(pool, queries)
	analyticsService := analytics.NewService(pool, queries)
	salesService := sales.NewService(pool, queries)
	batchesService := batches.NewService(pool, queries)

	// Initialize handlers
	authHandler := handler.NewAuthHandler(authService)
	productHandler := products.NewProductHandler(productService)
	inventoryHandler := inventory.NewHandler(inventoryService)
	analyticsHandler := analytics.NewHandler(analyticsService)
	salesHandler := sales.NewHandler(salesService)
	batchesHandler := batches.NewHandler(batchesService)
	reportsHandler := reports.NewHandler(queries)

	// Initialize Echo
	e := echo.New()

	// Middleware
	e.Use(echoMiddleware.Logger())
	// Use our custom Recover to avoid Echo's default interfering with error flow
	e.Use(middleware.RecoverMiddleware)
	e.Use(middleware.RequestIDMiddleware)
	// Use proper global HTTP error handler to preserve status codes
	e.HTTPErrorHandler = middleware.HTTPErrorHandler
	e.Use(echoMiddleware.CORSWithConfig(echoMiddleware.CORSConfig{
		AllowOrigins:     []string{"http://localhost:3000", "http://localhost:8080"},
		AllowMethods:     []string{http.MethodGet, http.MethodPut, http.MethodPost, http.MethodDelete, http.MethodPatch, http.MethodOptions},
		AllowHeaders:     []string{echo.HeaderOrigin, echo.HeaderContentType, echo.HeaderAccept, echo.HeaderAuthorization, "X-Debug-Client"},
		AllowCredentials: true,
	}))

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
			p := echoProm.NewPrometheus("agromart_http", echoMiddleware.DefaultSkipper)
			p.Use(e)

			// Register pprof handlers at /debug/pprof/*
			echoPprof.Register(e)

			// Register Swagger documentation
			e.GET("/swagger", func(c echo.Context) error {
				return c.Redirect(http.StatusMovedPermanently, "/swagger/")
			})
			e.GET("/swagger/", func(c echo.Context) error {
				return c.Redirect(http.StatusMovedPermanently, "/swagger/index.html")
			})
			e.Static("/swagger", "docs")
		}
	}
	// Health check - switch to comprehensive health handler
	healthHandler := handler.NewHealthHandler(database.New(pool))
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
	authMiddleware := auth.NewMiddleware(authService)

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
	// Me endpoint should be protected; wrap the handler invocation in RequireAuth
	authGroup.GET("/me", authMiddleware.RequireAuth(func(c echo.Context) error {
		return authHandler.Me(c)
	}))

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

	// Inventory routes (keep existing registration; assumed internal handlers enforce tenant/user)
	inventoryGroup := protected.Group("")
	inventoryHandler.RegisterRoutes(inventoryGroup)

	// Analytics routes under /api/analytics
	analyticsHandler.RegisterRoutes(protected)
	// RBAC for CSV exports already enforced in handlers via CanExport

	// Sales routes under /api/sales
	salesHandler.RegisterRoutes(protected)

	// Batches routes under /api/batches
	batchesHandler.RegisterRoutes(protected)

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
		tenantUUID, err := uuid.Parse(tenantStr)
		if err != nil {
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

	// Start server
	port := getPort(cfg.AppPort)
	log.Printf("[BOOT] Server starting on port %s", port)
	// Ensure graceful error surfacing while preserving proper exit on fatal
	if err := e.Start(":" + port); err != nil {
		log.Fatal(err)
	}
}

func getPort(defaultPort int) string {
	port := os.Getenv("PORT")
	if port == "" {
		return strconv.Itoa(defaultPort)
	}
	return port
}
