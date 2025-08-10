# AgroMart Backend Makefile
# Provides easy commands for testing, building, and development

.PHONY: help test test-unit test-integration test-coverage test-bench lint security clean build run dev docker deps

# Default target
.DEFAULT_GOAL := help

# Variables
GO_VERSION := $(shell go version | cut -d' ' -f3 | sed 's/go//')
PROJECT_NAME := agromart-backend
BUILD_DIR := ./build
COVERAGE_DIR := ./coverage
TEST_RESULTS_DIR := ./test-results
BINARY_NAME := agromart-server
DOCKER_IMAGE := agromart/backend
MIN_COVERAGE := 80

# Colors for output
GREEN := \033[0;32m
BLUE := \033[0;34m
YELLOW := \033[1;33m
RED := \033[0;31m
NC := \033[0m # No Color

help: ## Show this help message
	@echo "$(BLUE)AgroMart Backend - Available Commands$(NC)"
	@echo "======================================"
	@echo ""
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "$(GREEN)%-20s$(NC) %s\n", $$1, $$2}' $(MAKEFILE_LIST)
	@echo ""
	@echo "$(YELLOW)Examples:$(NC)"
	@echo "  make test              # Run all tests"
	@echo "  make test-unit         # Run only unit tests"
	@echo "  make test-coverage     # Run tests with coverage report"
	@echo "  make build             # Build the application"
	@echo "  make run               # Run the application"

# Development Commands
dev: deps ## Start development server with hot reload
	@echo "$(BLUE)Starting development server...$(NC)"
	@if command -v air > /dev/null 2>&1; then \
		air; \
	else \
		echo "$(YELLOW)Installing air for hot reload...$(NC)"; \
		go install github.com/cosmtrek/air@latest; \
		air; \
	fi

run: build ## Build and run the application
	@echo "$(BLUE)Running $(PROJECT_NAME)...$(NC)"
	@./$(BUILD_DIR)/$(BINARY_NAME)

deps: ## Install/update dependencies
	@echo "$(BLUE)Installing dependencies...$(NC)"
	@go mod tidy
	@go mod download
	@echo "$(GREEN)Dependencies installed$(NC)"

# Build Commands
build: clean ## Build the application binary
	@echo "$(BLUE)Building $(PROJECT_NAME)...$(NC)"
	@mkdir -p $(BUILD_DIR)
	@CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -ldflags '-extldflags "-static"' -o $(BUILD_DIR)/$(BINARY_NAME) .
	@echo "$(GREEN)Build complete: $(BUILD_DIR)/$(BINARY_NAME)$(NC)"

build-local: clean ## Build for local development
	@echo "$(BLUE)Building $(PROJECT_NAME) for local development...$(NC)"
	@mkdir -p $(BUILD_DIR)
	@go build -o $(BUILD_DIR)/$(BINARY_NAME) .
	@echo "$(GREEN)Local build complete: $(BUILD_DIR)/$(BINARY_NAME)$(NC)"

# Test Commands
test: ## Run all tests with comprehensive reporting
	@echo "$(BLUE)Running comprehensive test suite...$(NC)"
	@./run_tests.sh

test-unit: ## Run only unit tests
	@echo "$(BLUE)Running unit tests...$(NC)"
	@./run_tests.sh --unit-only

test-integration: ## Run only integration tests
	@echo "$(BLUE)Running integration tests...$(NC)"
	@./run_tests.sh --integration-only

test-coverage: ## Run tests and generate coverage report
	@echo "$(BLUE)Running tests with coverage analysis...$(NC)"
	@mkdir -p $(COVERAGE_DIR)
	@go test -v -race -coverprofile=$(COVERAGE_DIR)/coverage.out -covermode=atomic ./...
	@go tool cover -html=$(COVERAGE_DIR)/coverage.out -o $(COVERAGE_DIR)/coverage.html
	@go tool cover -func=$(COVERAGE_DIR)/coverage.out | tail -1
	@echo "$(GREEN)Coverage report: $(COVERAGE_DIR)/coverage.html$(NC)"

test-bench: ## Run benchmark tests
	@echo "$(BLUE)Running benchmark tests...$(NC)"
	@./run_tests.sh --with-benchmarks

test-quick: ## Run tests without coverage (faster for development)
	@echo "$(BLUE)Running quick test suite...$(NC)"
	@go test -v -short ./...

test-race: ## Run tests with race detection
	@echo "$(BLUE)Running tests with race detection...$(NC)"
	@go test -v -race ./...

test-verbose: ## Run tests with verbose output
	@echo "$(BLUE)Running tests with verbose output...$(NC)"
	@go test -v ./...

# Quality Assurance Commands
lint: ## Run linting tools
	@echo "$(BLUE)Running linting tools...$(NC)"
	@if ! command -v golangci-lint > /dev/null 2>&1; then \
		echo "$(YELLOW)Installing golangci-lint...$(NC)"; \
		go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest; \
	fi
	@golangci-lint run

lint-fix: ## Run linting tools with auto-fix
	@echo "$(BLUE)Running linting tools with auto-fix...$(NC)"
	@if ! command -v golangci-lint > /dev/null 2>&1; then \
		echo "$(YELLOW)Installing golangci-lint...$(NC)"; \
		go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest; \
	fi
	@golangci-lint run --fix

security: ## Run security analysis
	@echo "$(BLUE)Running security analysis...$(NC)"
	@if ! command -v gosec > /dev/null 2>&1; then \
		echo "$(YELLOW)Installing gosec...$(NC)"; \
		go install github.com/securecodewarrior/gosec/v2/cmd/gosec@latest; \
	fi
	@gosec ./...

fmt: ## Format Go code
	@echo "$(BLUE)Formatting Go code...$(NC)"
	@go fmt ./...
	@echo "$(GREEN)Code formatted$(NC)"

vet: ## Run go vet
	@echo "$(BLUE)Running go vet...$(NC)"
	@go vet ./...
	@echo "$(GREEN)Vet analysis complete$(NC)"

mod-tidy: ## Clean up go.mod and go.sum
	@echo "$(BLUE)Tidying Go modules...$(NC)"
	@go mod tidy
	@echo "$(GREEN)Modules tidied$(NC)"

# Database Commands
db-migrate: ## Run database migrations
	@echo "$(BLUE)Running database migrations...$(NC)"
	@if command -v migrate > /dev/null 2>&1; then \
		migrate -path ./sql/schema -database "$$DATABASE_URL" up; \
	else \
		echo "$(RED)migrate tool not found. Install from https://github.com/golang-migrate/migrate$(NC)"; \
	fi

db-migrate-down: ## Rollback database migrations
	@echo "$(BLUE)Rolling back database migrations...$(NC)"
	@if command -v migrate > /dev/null 2>&1; then \
		migrate -path ./sql/schema -database "$$DATABASE_URL" down 1; \
	else \
		echo "$(RED)migrate tool not found. Install from https://github.com/golang-migrate/migrate$(NC)"; \
	fi

db-reset: ## Reset database (drop and recreate)
	@echo "$(BLUE)Resetting database...$(NC)"
	@if command -v migrate > /dev/null 2>&1; then \
		migrate -path ./sql/schema -database "$$DATABASE_URL" drop -f; \
		migrate -path ./sql/schema -database "$$DATABASE_URL" up; \
	else \
		echo "$(RED)migrate tool not found. Install from https://github.com/golang-migrate/migrate$(NC)"; \
	fi

# Docker Commands
docker-build: ## Build Docker image
	@echo "$(BLUE)Building Docker image...$(NC)"
	@docker build -t $(DOCKER_IMAGE):latest .
	@echo "$(GREEN)Docker image built: $(DOCKER_IMAGE):latest$(NC)"

docker-run: docker-build ## Build and run Docker container
	@echo "$(BLUE)Running Docker container...$(NC)"
	@docker run --rm -p 8080:8080 --env-file .env $(DOCKER_IMAGE):latest

docker-dev: ## Start development environment with Docker Compose
	@echo "$(BLUE)Starting development environment...$(NC)"
	@docker-compose -f docker-compose.dev.yml up -d
	@echo "$(GREEN)Development environment started$(NC)"

docker-dev-logs: ## Show logs from development environment
	@docker-compose -f docker-compose.dev.yml logs -f

docker-dev-stop: ## Stop development environment
	@echo "$(BLUE)Stopping development environment...$(NC)"
	@docker-compose -f docker-compose.dev.yml down
	@echo "$(GREEN)Development environment stopped$(NC)"

docker-test: ## Run tests in Docker container
	@echo "$(BLUE)Running tests in Docker...$(NC)"
	@docker-compose -f docker-compose.test.yml up --build --abort-on-container-exit
	@docker-compose -f docker-compose.test.yml down -v

# Documentation Commands
docs: ## Generate API documentation
	@echo "$(BLUE)Generating API documentation...$(NC)"
	@if ! command -v swag > /dev/null 2>&1; then \
		echo "$(YELLOW)Installing swag...$(NC)"; \
		go install github.com/swaggo/swag/cmd/swag@latest; \
	fi
	@swag init -g main.go -o ./docs
	@echo "$(GREEN)API documentation generated in ./docs$(NC)"

docs-serve: docs ## Serve documentation locally
	@echo "$(BLUE)Serving documentation at http://localhost:8081$(NC)"
	@if command -v python3 > /dev/null 2>&1; then \
		cd docs && python3 -m http.server 8081; \
	elif command -v python > /dev/null 2>&1; then \
		cd docs && python -m SimpleHTTPServer 8081; \
	else \
		echo "$(RED)Python not found. Cannot serve documentation$(NC)"; \
	fi

# Utility Commands
clean: ## Clean build artifacts and temporary files
	@echo "$(BLUE)Cleaning build artifacts...$(NC)"
	@rm -rf $(BUILD_DIR)
	@rm -rf $(COVERAGE_DIR)
	@rm -rf $(TEST_RESULTS_DIR)
	@rm -f *.out
	@rm -f *.prof
	@go clean
	@echo "$(GREEN)Clean complete$(NC)"

install-tools: ## Install development tools
	@echo "$(BLUE)Installing development tools...$(NC)"
	@go install github.com/cosmtrek/air@latest
	@go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest
	@go install github.com/securecodewarrior/gosec/v2/cmd/gosec@latest
	@go install github.com/swaggo/swag/cmd/swag@latest
	@echo "$(GREEN)Development tools installed$(NC)"

version: ## Show version information
	@echo "$(BLUE)Version Information$(NC)"
	@echo "==================="
	@echo "Go Version: $(GO_VERSION)"
	@echo "Project: $(PROJECT_NAME)"
	@if [ -f ".git/HEAD" ]; then \
		echo "Git Branch: $$(git branch --show-current 2>/dev/null || echo 'unknown')"; \
		echo "Git Commit: $$(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')"; \
	fi

health-check: build-local ## Run health check on the application
	@echo "$(BLUE)Running health check...$(NC)"
	@./$(BUILD_DIR)/$(BINARY_NAME) &
	@SERVER_PID=$$!; \
	sleep 3; \
	if curl -f http://localhost:8080/health > /dev/null 2>&1; then \
		echo "$(GREEN)Health check passed$(NC)"; \
		kill $$SERVER_PID; \
	else \
		echo "$(RED)Health check failed$(NC)"; \
		kill $$SERVER_PID; \
		exit 1; \
	fi

# CI/CD Commands
ci-test: ## Run tests suitable for CI environment
	@echo "$(BLUE)Running CI test suite...$(NC)"
	@go test -v -race -coverprofile=coverage.out -covermode=atomic ./...
	@go tool cover -func=coverage.out | tail -1

ci-lint: ## Run linting for CI environment
	@echo "$(BLUE)Running CI linting...$(NC)"
	@golangci-lint run --out-format=github-actions

ci-security: ## Run security scan for CI environment
	@echo "$(BLUE)Running CI security scan...$(NC)"
	@gosec -fmt sarif -out gosec.sarif ./...

# Performance Commands
profile-cpu: build-local ## Profile CPU usage
	@echo "$(BLUE)Starting CPU profiling...$(NC)"
	@./$(BUILD_DIR)/$(BINARY_NAME) -cpuprofile=cpu.prof &
	@echo "$(YELLOW)Run your load tests now, then press Ctrl+C to stop profiling$(NC)"
	@trap 'kill %%1' INT; wait
	@go tool pprof cpu.prof

profile-mem: build-local ## Profile memory usage
	@echo "$(BLUE)Starting memory profiling...$(NC)"
	@./$(BUILD_DIR)/$(BINARY_NAME) -memprofile=mem.prof &
	@echo "$(YELLOW)Run your load tests now, then press Ctrl+C to stop profiling$(NC)"
	@trap 'kill %%1' INT; wait
	@go tool pprof mem.prof

# Quick development workflow
dev-setup: deps install-tools db-migrate ## Complete development setup
	@echo "$(GREEN)Development setup complete!$(NC)"
	@echo "$(BLUE)Next steps:$(NC)"
	@echo "  1. Copy .env.example to .env and configure"
	@echo "  2. Run 'make dev' to start development server"
	@echo "  3. Run 'make test' to run tests"

# Comprehensive quality check
quality: fmt vet lint security test ## Run all quality checks
	@echo "$(GREEN)All quality checks completed!$(NC)"
