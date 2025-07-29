package main

import (
	"database/sql"
	"log"
	"os"

	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	_ "github.com/lib/pq"

	"agromart2/internal/auth"
	"agromart2/internal/db"
	"agromart2/apps/server/products"
	"agromart2/apps/server/inventory"
)

func main() {
	// Initialize database connection
	database, err := sql.Open("postgres", getDatabaseURL())
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	defer database.Close()

	// Test database connection
	if err := database.Ping(); err != nil {
		log.Fatal("Failed to ping database:", err)
	}

	// Initialize SQLC queries
	queries := db.New(database)

	// Initialize services
	authService := auth.NewAuthService(queries, database)
	productService := products.NewService(queries)
	inventoryService := inventory.NewService(nil, queries) // Note: pgxpool not used in current service

	// Initialize handlers
	productHandler := products.NewHandler(productService)
	inventoryHandler := inventory.NewHandler(inventoryService)

	// Initialize Echo
	e := echo.New()

	// Middleware
	e.Use(middleware.Logger())
	e.Use(middleware.Recover())
	e.Use(middleware.CORS())

	// Health check
	e.GET("/health", func(c echo.Context) error {
		return c.JSON(200, map[string]string{
			"status": "ok",
			"service": "agromart-api",
		})
	})

	// API routes
	api := e.Group("/api")

	// Auth routes
	authGroup := api.Group("/auth")
	authMiddleware := auth.NewMiddleware(authService)
	
	authGroup.POST("/register", func(c echo.Context) error {
		// TODO: Implement register handler
		return c.JSON(501, map[string]string{"error": "not implemented"})
	})
	
	authGroup.POST("/login", func(c echo.Context) error {
		// TODO: Implement login handler
		return c.JSON(501, map[string]string{"error": "not implemented"})
	})
	
	authGroup.POST("/logout", func(c echo.Context) error {
		// TODO: Implement logout handler
		return c.JSON(501, map[string]string{"error": "not implemented"})
	})
	
	authGroup.GET("/me", authMiddleware.RequireAuth(func(c echo.Context) error {
		// TODO: Implement me handler
		return c.JSON(501, map[string]string{"error": "not implemented"})
	}))

	// Protected routes
	protected := api.Group("")
	protected.Use(authMiddleware.RequireAuth)

	// Product routes
	productGroup := protected.Group("/products")
	productHandler.RegisterRoutes(productGroup)

	// Unit routes
	unitGroup := protected.Group("/units")
	// TODO: Implement unit handlers

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
	port := getPort()
	log.Printf("Server starting on port %s", port)
	log.Fatal(e.Start(":" + port))
}

func getDatabaseURL() string {
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgres://username:password@localhost/agromart2?sslmode=disable"
	}
	return dbURL
}

func getPort() string {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	return port
}
