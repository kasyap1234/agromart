package main

import (
	"context"
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
	"agromart2/apps/server/suppliers"
	"agromart2/db"
	"agromart2/internal/auth"
	"agromart2/internal/database"
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	"github.com/rs/zerolog/log"
)

func main() {
	// Initialize logger
	// logger.InitLogger()
	
	conf, err := config.LoadConfig()
	if err != nil {
		log.Fatal().Err(err).Msg("failed to load config")
	}

	// Initialize database configuration
	dbConfig := &database.Config{
		Host:     conf.DB_Host,
		Port:     conf.DB_Port,
		User:     conf.DB_User,
		Password: conf.DB_Password,
		Database: conf.DB_Name,
		SSLMode:  "disable",
		MaxConns: 25,
		MinConns: 5,
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

	// Initialize services
	authService := auth.NewAuthService(dbPool, queries, jwtService)
	productService := products.NewProductService(dbPool, queries)
	inventoryService := inventory.NewService(dbPool, queries)
	supplierService := suppliers.NewSupplierService(dbPool, queries)
	customerService := customers.NewCustomerService(dbPool, queries)

	// Initialize handlers
	authHandler := handler.NewAuthHandler(authService)
	productHandler := products.NewHandler(productService)
	inventoryHandler := inventory.NewHandler(inventoryService)
	supplierHandler := suppliers.NewHandler(supplierService)
	customerHandler := customers.NewHandler(customerService)
	healthHandler := handler.NewHealthHandler(dbService)

	// Initialize middleware
	authMiddleware := auth.NewMiddleware(authService)

	// Setup Echo server
	e := echo.New()

	// Add global middleware
	e.Use(middleware.Logger())
	e.Use(middleware.Recover())
	e.Use(middleware.CORS())

	// Setup health check routes
	healthHandler.RegisterRoutes(e)

	// Setup public auth routes
	authHandler.RegisterRoutes(e)

	// Setup API routes
	api := e.Group("/api")

	// Protected routes
	protected := api.Group("")
	protected.Use(authMiddleware.RequireAuth)

	// Auth protected routes
	authHandler.RegisterProtectedRoutes(protected)

	// Business logic routes
	productHandler.RegisterRoutes(protected)
	inventoryHandler.RegisterRoutes(protected)
	supplierHandler.RegisterRoutes(protected)
	customerHandler.RegisterRoutes(protected)

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
