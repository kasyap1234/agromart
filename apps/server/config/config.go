package config

import (
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/spf13/viper"
)

type Config struct {
	AppPort           int           `mapstructure:"APP_APPPORT"`
	DB_Host           string        `mapstructure:"APP_DB_HOST"`
	DB_Port           int           `mapstructure:"APP_DB_PORT"`
	DB_User           string        `mapstructure:"APP_DB_USER"`
	DB_Password       string        `mapstructure:"APP_DB_PASSWORD"`
	DB_Name           string        `mapstructure:"APP_DB_NAME"`
	MaxConns          int           `mapstructure:"MAX_CONNS"`
	MinConns          int           `mapstructure:"MIN_CONNS"`
	MaxConnLifeTime   time.Duration `mapstructure:"MAX_CONN_LIFE_TIME"`
	MaxConnIdleTime   time.Duration `mapstructure:"MAX_CONN_IDLE_TIME"`
	HealthCheckPeriod time.Duration `mapstructure:"HEALTH_CHECK_PERIOD"`
}

func LoadConfig() (*Config, error) {
	// Read from .env file
	viper.SetConfigFile("/home/tgt/GolandProjects/alertify/.env")
	viper.SetConfigType("env")

	// Read from config file first
	if err := viper.ReadInConfig(); err != nil {
		return nil, fmt.Errorf("error reading .env file: %w", err)
	}

	// Then override with environment variables if available

	viper.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))
	viper.AutomaticEnv()

	var c Config
	if err := viper.Unmarshal(&c); err != nil {
		log.Fatalf("unable to decode config into struct: %v", err)
	}

	return &c, nil
}
