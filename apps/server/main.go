package main

import (
	"context"
	"log"
	"os"
	"strconv"
	"time"

	"github.com/labstack/echo/v4"
	echoMiddleware "github.com/labstack/echo/v4/middleware"
	"github.com/google/uuid"

	"agromart2/apps/server/config"
	"agromart2/internal/auth"
	"agromart2/internal/database"
	"agromart2/internal/middleware"

	"agromart2/db"
	"agromart2/apps/server/products"
	"agromart2/apps/server/inventory"
	"agromart2/apps/server/handler"
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
	if err := dbConfig.Validate(); err != nil {
		log.Fatal("Invalid database config:", err)
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

	// Initialize SQLC queries
	queries := db.New(pool)

	// Initialize JWT service
	jwtService := auth.NewJWTService(cfg.JWTSecret)

	// Initialize services
	authService := auth.NewAuthService(pool, queries, jwtService)
	productService := products.NewProductService(pool, queries)
	inventoryService := inventory.NewService(pool, queries)

	// Initialize handlers
	authHandler := handler.NewAuthHandler(authService)
	productHandler := products.NewHandler(productService)
	inventoryHandler := inventory.NewHandler(inventoryService)

	// Initialize Echo
	e := echo.New()

	// Middleware
	e.Use(echoMiddleware.Logger())
	// Use our custom Recover to avoid Echo's default interfering with error flow
	e.Use(middleware.RecoverMiddleware)
	e.Use(middleware.RequestIDMiddleware)
	// Use proper global HTTP error handler to preserve status codes
	e.HTTPErrorHandler = middleware.HTTPErrorHandler
	e.Use(echoMiddleware.CORS())

	// Health check
	e.GET("/health", func(c echo.Context) error {
		return c.JSON(200, map[string]string{
			"status":  "ok",
			"service": "agromart-api",
		})
	})

	// API routes
	api := e.Group("/api")

	// Auth routes
	authGroup := api.Group("/auth")
	authMiddleware := auth.NewMiddleware(authService)

	authGroup.POST("/register", authHandler.Register)
	authGroup.POST("/login", authHandler.Login)
	authGroup.POST("/logout", authHandler.Logout)
	authGroup.POST("/refresh", authHandler.RefreshToken)
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
	productHandler.RegisterRoutes(productGroup)

	// Inventory routes
	inventoryGroup := protected.Group("")
	inventoryHandler.RegisterRoutes(inventoryGroup)

	// Reports routes
	reportsGroup := protected.Group("/reports")
	// Dashboard stats - real implementation using inventory service
	reportsGroup.GET("/dashboard-stats", func(c echo.Context) error {
		tenantStr, ok := c.Get("tenant_id").(string)
		if !ok || tenantStr == "" {
			return echo.NewHTTPError(401, "invalid tenant context")
		}
		tenantUUID, err := uuid.Parse(tenantStr)
		if err != nil {
			return echo.NewHTTPError(401, "invalid tenant id")
		}
		stats, err := inventoryService.GetInventorySummary(c.Request().Context(), tenantUUID)
		if err != nil {
			log.Printf("[REPORTS] dashboard-stats error: %v", err)
			return echo.NewHTTPError(500, "failed to compute dashboard stats")
		}
		return c.JSON(200, map[string]interface{}{
			"success": true,
			"data":    stats,
		})
	})

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
			if v, err := strconv.Atoi(t); err == nil && v >= 0 {
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
			if v, err := strconv.Atoi(d); err == nil && v >= 0 {
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
