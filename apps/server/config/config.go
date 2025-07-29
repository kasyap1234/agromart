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
	JWTSecret         string        `mapstructure:"JWT_SECRET"`
	MaxConns          int           `mapstructure:"MAX_CONNS"`
	MinConns          int           `mapstructure:"MIN_CONNS"`
	MaxConnLifeTime   time.Duration `mapstructure:"MAX_CONN_LIFE_TIME"`
	MaxConnIdleTime   time.Duration `mapstructure:"MAX_CONN_IDLE_TIME"`
	HealthCheckPeriod time.Duration `mapstructure:"HEALTH_CHECK_PERIOD"`
}

func LoadConfig() (*Config, error) {
	// Set default values
	viper.SetDefault("APP_APPPORT", 8080)
	viper.SetDefault("APP_DB_HOST", "localhost")
	viper.SetDefault("APP_DB_PORT", 5432)
	viper.SetDefault("APP_DB_USER", "postgres")
	viper.SetDefault("APP_DB_PASSWORD", "password")
	viper.SetDefault("APP_DB_NAME", "agromart")
	viper.SetDefault("JWT_SECRET", "your-secret-key-change-in-production")
	viper.SetDefault("MAX_CONNS", 25)
	viper.SetDefault("MIN_CONNS", 5)
	viper.SetDefault("MAX_CONN_LIFE_TIME", "1h")
	viper.SetDefault("MAX_CONN_IDLE_TIME", "30m")
	viper.SetDefault("HEALTH_CHECK_PERIOD", "1m")

	// Try to read from .env file (optional)
	viper.SetConfigName(".env")
	viper.SetConfigType("env")
	viper.AddConfigPath(".")
	viper.AddConfigPath("./apps/server")
	viper.AddConfigPath("/app")

	// Read from config file if it exists (don't fail if it doesn't)
	if err := viper.ReadInConfig(); err != nil {
		log.Printf("Warning: Could not read config file: %v. Using environment variables and defaults.", err)
	}

	// Environment variables take precedence
	viper.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))
	viper.AutomaticEnv()

	var c Config
	if err := viper.Unmarshal(&c); err != nil {
		return nil, fmt.Errorf("unable to decode config into struct: %w", err)
	}

	return &c, nil
}
