#!/bin/bash

# Backend Testing Script for AgroMart
# This script runs comprehensive backend tests with coverage

set -e

echo "🚀 Starting AgroMart Backend Tests..."

# Set environment for testing
export APP_ENV=test
export DATABASE_URL="postgres://postgres:password@localhost:5432/agromart_test?sslmode=disable"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "go.mod" ]; then
    print_error "Must be run from the project root directory"
    exit 1
fi

# Check if PostgreSQL is running (optional - for integration tests)
if command -v pg_isready &> /dev/null; then
    if pg_isready -h localhost -p 5432 -U postgres &> /dev/null; then
        print_status "PostgreSQL is running"
    else
        print_warning "PostgreSQL not running - integration tests may fail"
    fi
fi

print_status "Running Go mod tidy..."
go mod tidy

print_status "Running Go vet..."
go vet ./...

print_status "Running unit tests with coverage..."
go test -v -race -coverprofile=coverage.out ./internal/...
go test -v -race -coverprofile=handler_coverage.out ./apps/server/handler/...
go test -v -race -coverprofile=service_coverage.out ./apps/server/...

# Combine coverage files
print_status "Combining coverage reports..."
gocovmerge coverage.out handler_coverage.out service_coverage.out > combined_coverage.out

# Generate coverage report
print_status "Generating coverage report..."
go tool cover -html=combined_coverage.out -o coverage.html
go tool cover -func=combined_coverage.out

# Check coverage threshold
COVERAGE=$(go tool cover -func=combined_coverage.out | grep total | awk '{print substr($3, 1, length($3)-1)}')
THRESHOLD=85.0

print_status "Total coverage: ${COVERAGE}%"
print_status "Required threshold: ${THRESHOLD}%"

# Convert coverage to number for comparison
COVERAGE_NUM=$(echo $COVERAGE | sed 's/%//')
if (( $(echo "$COVERAGE_NUM >= $THRESHOLD" | bc -l) )); then
    print_status "✅ Coverage threshold met!"
else
    print_error "❌ Coverage threshold not met!"
    exit 1
fi

# Run benchmarks
print_status "Running benchmarks..."
go test -bench=. -benchmem ./internal/...
go test -bench=. -benchmem ./apps/server/...

print_status "✅ All tests completed successfully!"
print_status "Coverage report: coverage.html"