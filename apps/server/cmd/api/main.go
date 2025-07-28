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
	"github.com/kasyap1234/agromart/database"
	"github.com/kasyap1234/agromart/docs"
	"github.com/kasyap1234/agromart/handlers"
	"github.com/kasyap1234/agromart/repositories"
	"github.com/kasyap1234/agromart/services"
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	echoSwagger "github.com/swaggo/echo-swagger"
	"github.com/rs/zerolog/log"
)

func main() {
	logger.InitLogger()
	conf, err := config.LoadConfig()
	if err != nil {
		panic(err)
	}

// Database connection
	conn := database.Config{
		Host:     conf.DB_Host,
		User:     conf.DB_User,
		Password: conf.DB_Password,
		DBName:   conf.DB_Name,
		Port:     conf.DB_Port,
		SSLMode:  "disable",
	}
	db, err := database.Connect(conn)
	if err != nil {
		panic(err)
	}

// Run database migrations
	database.AutoMigrate(db)

	userRepo := repositories.NewUserRepository(db)
	productRepo := repositories.NewProductRepository(db)
	authService := services.NewAuthService(userRepo, "your-jwt-secret")
	authHandler := handlers.NewAuthHandler(authService)

	// Echo instance
	e := echo.New()

	// Middleware
	e.Use(middleware.Logger())
	e.Use(middleware.Recover())
	e.Use(middleware.CORS())

	// Routes
	e.POST("/auth/login", authHandler.Login)
	e.POST("/auth/register", authHandler.Register)
	e.POST("/auth/refresh", authHandler.RefreshToken)
	e.POST("/auth/change-password", authHandler.ChangePassword, middleware.JWTWithConfig(middleware.JWTConfig{
		SigningKey: []byte("your-jwt-secret"),
		Claims:     &services.JWTClaims{},
	}))
	e.GET("/auth/profile", authHandler.GetProfile, middleware.JWTWithConfig(middleware.JWTConfig{
		SigningKey: []byte("your-jwt-secret"),
		Claims:     &services.JWTClaims{},
	}))

	// Swagger documentation
	docs.SwaggerInfo.BasePath = "/"
	e.GET("/swagger/*", echoSwagger.WrapHandler)

	// Start server
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	go func() {
	log.Printf("server starting on port %d", conf.AppPort)
	if err := e.Start(":" + strconv.Itoa(conf.AppPort)); err != nil {
		log.Fatal().Err(err).Msg("server failed to start")
	}
})()
<-quit

	log.Printf("server shutting down")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := e.Shutdown(ctx); err != nil {
		log.Fatal().Err(err).Msg("server failed to shutdown")
	}
	log.Printf("server stopped")
}
