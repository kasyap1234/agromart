package database

import (
	"fmt"
	"log"

	"github.com/kasyap1234/agromart/models"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

type Config struct {
	Host     string
	Port     string
	User     string
	Password string
	DBName   string
	SSLMode  string
}

func Connect(config Config) (*gorm.DB, error) {
	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=%s TimeZone=UTC",
		config.Host, config.User, config.Password, config.DBName, config.Port, config.SSLMode)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	return db, nil
}

// AutoMigrate runs all database migrations
func AutoMigrate(db *gorm.DB) error {
	// Create custom types if they don't exist
	if err := createCustomTypes(db); err != nil {
		return fmt.Errorf("failed to create custom types: %w", err)
	}

	// Auto migrate all models
	err := db.AutoMigrate(
		&models.Tenant{},
		&models.User{},
		&models.Unit{},
		&models.Product{},
		&models.Batch{},
		&models.Inventory{},
		&models.InventoryLog{},
		&models.Supplier{},
		&models.Customer{},
		&models.Location{},
		&models.PurchaseOrder{},
		&models.PurchaseOrderItem{},
		&models.SalesOrder{},
		&models.SalesOrderItem{},
	)
	if err != nil {
		return fmt.Errorf("failed to migrate database: %w", err)
	}

	log.Println("Database migration completed successfully")
	return nil
}

// createCustomTypes creates custom PostgreSQL types
func createCustomTypes(db *gorm.DB) error {
	// Create user_role enum type
	result := db.Exec(`
		DO $$
		BEGIN
			IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
				CREATE TYPE user_role AS ENUM ('user', 'supervisor', 'manager', 'super_admin');
			END IF;
		END
		$$;
	`)
	if result.Error != nil {
		return fmt.Errorf("failed to create user_role enum: %w", result.Error)
	}

	return nil
}
