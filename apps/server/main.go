package main

import (
	"context"
	"log"
	"os"
	"strconv"

	"github.com/labstack/echo/v4"
	echoMiddleware "github.com/labstack/echo/v4/middleware"

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
	// Load configuration
	cfg, err := config.LoadConfig()
	if err != nil {
		log.Fatal("Failed to load config:", err)
	}

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
	pool, err := dbConfig.NewPool(ctx)
	if err != nil {
		log.Fatal("Failed to create database connection pool:", err)
	}
	defer pool.Close()

	// Test database connection
	if err := pool.Ping(ctx); err != nil {
		log.Fatal("Failed to ping database:", err)
	}

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
	e.Use(echoMiddleware.Recover())
	e.Use(middleware.RequestIDMiddleware)
	e.Use(middleware.ErrorHandler)
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
	authGroup.GET("/me", authMiddleware.RequireAuth(authHandler.Me))

	// Protected routes
	protected := api.Group("")
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
	reportsGroup.GET("/dashboard-stats", func(c echo.Context) error {
		// TODO: Implement dashboard stats
		return c.JSON(200, map[string]interface{}{
			"success": true,
			"data": map[string]interface{}{
				"total_products":     150,
				"low_stock_count":    12,
				"total_value":        45000,
				"expiring_batches":   8,
			},
		})
	})
	
	reportsGroup.GET("/low-stock", func(c echo.Context) error {
		// TODO: Implement low stock report
		return c.JSON(200, map[string]interface{}{
			"success": true,
			"data":    []interface{}{},
		})
	})
	
	reportsGroup.GET("/expiring-batches", func(c echo.Context) error {
		// TODO: Implement expiring batches report
		return c.JSON(200, map[string]interface{}{
			"success": true,
			"data":    []interface{}{},
		})
	})

	// Start server
	port := getPort(cfg.AppPort)
	log.Printf("Server starting on port %s", port)
	log.Fatal(e.Start(":" + port))
}

func getPort(defaultPort int) string {
	port := os.Getenv("PORT")
	if port == "" {
		return strconv.Itoa(defaultPort)
	}
	return port
}
