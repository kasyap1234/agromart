package config

import (
	"fmt"
	"log"
	"os"
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

	// MinIO Configuration
	MinIOEndpoint   string `mapstructure:"MINIO_ENDPOINT"`
	MinIOAccessKey  string `mapstructure:"MINIO_ACCESS_KEY"`
	MinIOSecretKey  string `mapstructure:"MINIO_SECRET_KEY"`
	MinIOBucketName string `mapstructure:"MINIO_BUCKET_NAME"`
	MinIOUSessl     bool   `mapstructure:"MINIO_USE_SSL"`

	// File Upload Configuration
	MaxFileSize         int64  `mapstructure:"MAX_FILE_SIZE"`         // in bytes
	AllowedImageTypes   string `mapstructure:"ALLOWED_IMAGE_TYPES"`   // comma-separated
	AllowedDocTypes     string `mapstructure:"ALLOWED_DOC_TYPES"`     // comma-separated
	ImageQuality        int    `mapstructure:"IMAGE_QUALITY"`         // 1-100
	MaxImageWidth       int    `mapstructure:"MAX_IMAGE_WIDTH"`       // pixels
	MaxImageHeight      int    `mapstructure:"MAX_IMAGE_HEIGHT"`      // pixels
	EnableVirusScanning bool   `mapstructure:"ENABLE_VIRUS_SCANNING"`
	ClamAVSocketPath    string `mapstructure:"CLAMAV_SOCKET_PATH"`

	// Performance and Caching Configuration
	EnableRedis         bool   `mapstructure:"ENABLE_REDIS"`
	RedisHost           string `mapstructure:"REDIS_HOST"`
	RedisPort           int    `mapstructure:"REDIS_PORT"`
	RedisPassword       string `mapstructure:"REDIS_PASSWORD"`
	RedisDB             int    `mapstructure:"REDIS_DB"`
	CacheTTL            int    `mapstructure:"CACHE_TTL"` // in seconds

	// Rate Limiting Configuration
	RateLimitRequests   int    `mapstructure:"RATE_LIMIT_REQUESTS"`
	RateLimitWindow     int    `mapstructure:"RATE_LIMIT_WINDOW"` // in minutes
	RateLimitBurst      int    `mapstructure:"RATE_LIMIT_BURST"`

	// Database Performance Configuration
	QueryTimeout        int    `mapstructure:"QUERY_TIMEOUT"`        // in seconds
	EnableQueryLogging  bool   `mapstructure:"ENABLE_QUERY_LOGGING"`
	SlowQueryThreshold  int    `mapstructure:"SLOW_QUERY_THRESHOLD"` // in milliseconds
}

func LoadConfig() (*Config, error) {
	// Set default values
	viper.SetDefault("APP_APPPORT", 8080)
	viper.SetDefault("APP_DB_HOST", "localhost")
	viper.SetDefault("APP_DB_PORT", 5432)
	viper.SetDefault("APP_DB_USER", "postgres")
	viper.SetDefault("APP_DB_PASSWORD", "secret")
	viper.SetDefault("APP_DB_NAME", "agromart")
	viper.SetDefault("JWT_SECRET", "your-secret-key-change-in-production")
	viper.SetDefault("MAX_CONNS", 25)
	viper.SetDefault("MIN_CONNS", 5)
	viper.SetDefault("MAX_CONN_LIFE_TIME", "1h")
	viper.SetDefault("MAX_CONN_IDLE_TIME", "30m")
	viper.SetDefault("HEALTH_CHECK_PERIOD", "1m")

	// MinIO defaults
	viper.SetDefault("MINIO_ENDPOINT", "localhost:9000")
	viper.SetDefault("MINIO_ACCESS_KEY", "minioadmin")
	viper.SetDefault("MINIO_SECRET_KEY", "minioadmin")
	viper.SetDefault("MINIO_BUCKET_NAME", "agromart-files")
	viper.SetDefault("MINIO_USE_SSL", false)

	// File upload defaults
	viper.SetDefault("MAX_FILE_SIZE", 2*1024*1024) // 2MB
	viper.SetDefault("ALLOWED_IMAGE_TYPES", "image/jpeg,image/png,image/webp")
	viper.SetDefault("ALLOWED_DOC_TYPES", "application/pdf,text/plain")
	viper.SetDefault("IMAGE_QUALITY", 85)
	viper.SetDefault("MAX_IMAGE_WIDTH", 1920)
	viper.SetDefault("MAX_IMAGE_HEIGHT", 1080)
	viper.SetDefault("ENABLE_VIRUS_SCANNING", false)
	viper.SetDefault("CLAMAV_SOCKET_PATH", "/var/run/clamav/clamd.ctl")

	// Performance and caching defaults
	viper.SetDefault("ENABLE_REDIS", false)
	viper.SetDefault("REDIS_HOST", "localhost")
	viper.SetDefault("REDIS_PORT", 6379)
	viper.SetDefault("REDIS_PASSWORD", "")
	viper.SetDefault("REDIS_DB", 0)
	viper.SetDefault("CACHE_TTL", 3600) // 1 hour

	// Rate limiting defaults
	viper.SetDefault("RATE_LIMIT_REQUESTS", 1000)
	viper.SetDefault("RATE_LIMIT_WINDOW", 60) // 1 hour in minutes
	viper.SetDefault("RATE_LIMIT_BURST", 100)

	// Database performance defaults
	viper.SetDefault("QUERY_TIMEOUT", 30) // 30 seconds
	viper.SetDefault("ENABLE_QUERY_LOGGING", false)
	viper.SetDefault("SLOW_QUERY_THRESHOLD", 1000) // 1 second

	// Try to read from .env file (optional)
	viper.SetConfigName(".env")
	viper.SetConfigType("env")
	viper.AddConfigPath(".")
	viper.AddConfigPath("./apps/server")
	viper.AddConfigPath("/app")

	// Read from config file if it exists (don't fail if it doesn't)
	if err := viper.ReadInConfig(); err != nil {
		log.Printf("[CONFIG] Could not read .env: %v (falling back to env/defaults)", err)
	}

	// Environment variables take precedence
	viper.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))
	viper.AutomaticEnv()

	var c Config
	if err := viper.Unmarshal(&c); err != nil {
		return nil, fmt.Errorf("unable to decode config into struct: %w", err)
	}

	// Manually parse duration strings from environment variables
	if healthCheckPeriodStr := viper.GetString("HEALTH_CHECK_PERIOD"); healthCheckPeriodStr != "" {
		duration, err := time.ParseDuration(healthCheckPeriodStr)
		if err != nil {
			return nil, fmt.Errorf("invalid HEALTH_CHECK_PERIOD duration: %w", err)
		}
		c.HealthCheckPeriod = duration
	}

	if maxConnLifeTimeStr := viper.GetString("MAX_CONN_LIFE_TIME"); maxConnLifeTimeStr != "" {
		duration, err := time.ParseDuration(maxConnLifeTimeStr)
		if err != nil {
			return nil, fmt.Errorf("invalid MAX_CONN_LIFE_TIME duration: %w", err)
		}
		c.MaxConnLifeTime = duration
	}

	if maxConnIdleTimeStr := viper.GetString("MAX_CONN_IDLE_TIME"); maxConnIdleTimeStr != "" {
		duration, err := time.ParseDuration(maxConnIdleTimeStr)
		if err != nil {
			return nil, fmt.Errorf("invalid MAX_CONN_IDLE_TIME duration: %w", err)
		}
		c.MaxConnIdleTime = duration
	}

	// Diagnostics
	mask := func(s string) string {
		if len(s) <= 4 {
			return "****"
		}
		return s[:2] + "****" + s[len(s)-2:]
	}
	log.Printf("[CONFIG] Loaded. Port=%d DB=%s:%d/%s User=%s Pwd=%s JWT?%t MinIO=%s Bucket=%s FileSize=%dMB ENV=%s",
		c.AppPort, c.DB_Host, c.DB_Port, c.DB_Name, c.DB_User, mask(c.DB_Password), c.JWTSecret != "",
		c.MinIOEndpoint, c.MinIOBucketName, c.MaxFileSize/(1024*1024), os.Getenv("GO_ENV"))

	return &c, nil
}
