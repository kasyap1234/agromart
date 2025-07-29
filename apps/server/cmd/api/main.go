package main

import (
	"context"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	"github.com/kasyap1234/agromart/apps/server/config"
	"github.com/kasyap1234/agromart/apps/server/pkg/logger"
	"github.com/kasyap1234/agromart/internal/database"
	"github.com/labstack/echo/v4"
	"github.com/rs/zerolog/log"
)

func main() {
	logger.InitLogger()
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

	// Setup Echo server
	e := echo.New()

	// TODO: Setup routes with services
	// Example:
	// productService := products.NewProductService(dbPool, queries)
	// inventoryService := inventory.NewService(dbPool, queries)

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
