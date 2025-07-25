package main

import (
	"context"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	"agromart/apps/server/config"
	"agromart/apps/server/pkg/logger"

	"github.com/labstack/echo/v4"
	"github.com/rs/zerolog/log"
)

func main() {
	logger.InitLogger()
	conf, err := config.LoadConfig()
	if err != nil {
		panic(err)
	}
	//	connStr := config.SetConnectionString((conf.DB_Host), (conf.DB_User), (conf.DB_Password), (conf.DB_Name), (conf.DB_Port))
	quit := make(chan os.Signal, 1)
	e := echo.New()
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	go func() {
		log.Printf("server starting on port %d", conf.AppPort)
		if err := e.Start(":" + strconv.Itoa(conf.AppPort)); err != nil {
			log.Fatal().Err(err).Msg("server failed to start")
		}
	}()
	<-quit
	log.Printf("server shutting down")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := e.Shutdown(ctx); err != nil {
		log.Fatal().Err(err).Msg("server failed to shutdown")
	}
	log.Printf("server stopped")
}
