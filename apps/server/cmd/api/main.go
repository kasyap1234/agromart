package main

import (
	"os"
	"os/signal"
	"strconv"
	"syscall"

	"agromart/apps/server/config"
	"agromart/pkg/logger"

	"github.com/labstack/echo/v4"
	"github.com/rs/zerolog/log"
)

func main() {
	logger.InitLogger()
	conf, err := config.LoadConfig()
	if err != nil {
		panic(err)
	}
	connStr := config.SetConnectionString((conf.DB_Host), (conf.DB_User), (conf.DB_Password), (conf.DB_Name), (conf.DB_Port))
	quit := make(chan os.Signal, 1)
	e := echo.New()
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	go func() {
		log.Printf("server starting on port %d", conf.AppPort)
		if err := e.Start(":" + strconv.Itoa(conf.AppPort)); err != nil {
			log.Fatal().Err(err).Msg("server failed to start")
		}
	}()
}
