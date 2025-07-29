# Agromart Makefile
.PHONY: help build run test clean sqlc migrate-up migrate-down docker-up docker-down

# Default help target
help: ## Show this help message
	@echo "Available targets:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

# Build the application
build: ## Build the application
	@echo "Building application..."
	go build -o bin/agromart ./apps/server/cmd/api

# Run the application
run: ## Run the application
	@echo "Starting application..."
	go run ./apps/server/cmd/api/main.go

# Run tests
test: ## Run tests
	@echo "Running tests..."
	go test -v ./...

# Run tests with coverage
test-coverage: ## Run tests with coverage report
	@echo "Running tests with coverage..."
	go test -v -coverprofile=coverage.out ./...
	go tool cover -html=coverage.out -o coverage.html

# Clean build artifacts
clean: ## Clean build artifacts
	@echo "Cleaning..."
	rm -rf bin/
	rm -f coverage.out coverage.html

# Generate SQL code using sqlc
sqlc: ## Generate SQL code using sqlc
	@echo "Generating SQL code..."
	sqlc generate

# Format code
fmt: ## Format Go code
	@echo "Formatting code..."
	go fmt ./...

# Lint code
lint: ## Lint Go code
	@echo "Linting code..."
	golangci-lint run

# Tidy go modules
tidy: ## Tidy go modules
	@echo "Tidying go modules..."
	go mod tidy

# Vendor dependencies
vendor: ## Vendor dependencies
	@echo "Vendoring dependencies..."
	go mod vendor

# Start database with docker
docker-db-up: ## Start PostgreSQL database with docker-compose
	@echo "Starting database..."
	docker-compose -f docker-compose.db.yml up -d

# Stop database
docker-db-down: ## Stop PostgreSQL database
	@echo "Stopping database..."
	docker-compose -f docker-compose.db.yml down

# Start all services
docker-up: ## Start all services with docker-compose
	@echo "Starting all services..."
	docker-compose up -d

# Stop all services
docker-down: ## Stop all services
	@echo "Stopping all services..."
	docker-compose down

# Database migration up (requires golang-migrate)
migrate-up: ## Run database migrations up
	@echo "Running migrations up..."
	migrate -path apps/server/sql/schema -database postgres://postgres:password@localhost:5432/agromart?sslmode=disable up

# Database migration down (requires golang-migrate)
migrate-down: ## Run database migrations down
	@echo "Running migrations down..."
	migrate -path apps/server/sql/schema -database postgres://postgres:password@localhost:5432/agromart?sslmode=disable down

# Create a new migration file (requires golang-migrate)
migrate-create: ## Create a new migration file (usage: make migrate-create NAME=migration_name)
	@if [ -z "$(NAME)" ]; then \
		echo "Error: NAME is required. Usage: make migrate-create NAME=migration_name"; \
		exit 1; \
	fi
	@echo "Creating migration: $(NAME)"
	migrate create -ext sql -dir apps/server/sql/schema -seq $(NAME)

# Install development dependencies
dev-deps: ## Install development dependencies
	@echo "Installing development dependencies..."
	go install github.com/sqlc-dev/sqlc/cmd/sqlc@latest
	go install github.com/golang-migrate/migrate/v4/cmd/migrate@latest
	go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest

# Development setup
dev-setup: dev-deps docker-db-up ## Set up development environment
	@echo "Development environment ready!"
	@echo "Run 'make sqlc' to generate SQL code"
	@echo "Run 'make migrate-up' to run migrations"
	@echo "Run 'make run' to start the application"

# Check application health
health: ## Check application health
	@echo "Checking application health..."
	curl -f http://localhost:8080/health || echo "Application not running"
