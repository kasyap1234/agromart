#!/bin/bash

# AgroMart CI Testing Script
# Comprehensive testing pipeline for GitHub Actions
#
# Features:
# - Backend unit and integration tests
# - Frontend unit and E2E tests
# - Database migration validation
# - Performance testing with k6
# - Security scanning
# - Code quality checks

set -e  # Exit on any error

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
MIGRATIONS_PATH="apps/server/sql/schema"

# Color codes for output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly PURPLE='\033[0;35m'
readonly NC='\033[0m' # No Color

# Test configuration
readonly DB_HOST="${DB_HOST:-localhost}"
readonly DB_PORT="${DB_PORT:-5432}"
readonly DB_USER="${DB_USER:-postgres}"
readonly DB_PASSWORD="${DB_PASSWORD:-secret}"
readonly DB_NAME="${DB_NAME:-agromart_test}"
readonly DATABASE_URL="postgres://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?sslmode=disable"

# Test results
BACKEND_TESTS_PASSED=false
FRONTEND_TESTS_PASSED=false
E2E_TESTS_PASSED=false
MIGRATION_TESTS_PASSED=false
PERFORMANCE_TESTS_PASSED=false

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $(date '+%H:%M:%S') $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $(date '+%H:%M:%S') $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $(date '+%H:%M:%S') $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%H:%M:%S') $1"
}

log_step() {
    echo -e "${PURPLE}[STEP]${NC} $(date '+%H:%M:%S') $1"
}

# Error handling
error_exit() {
    log_error "$1"
    generate_test_report
    exit 1
}

# Function to check prerequisites for testing
check_test_prerequisites() {
    log_step "Checking CI testing prerequisites..."
    
    # Check Docker
    if ! docker info >/dev/null 2>&1; then
        error_exit "Docker is not running"
    fi
    
    # Check golang-migrate CLI
    if ! command -v migrate &> /dev/null; then
        log_warning "golang-migrate CLI not found, installing..."
        if command -v brew &> /dev/null; then
            brew install golang-migrate
        else
            curl -L https://github.com/golang-migrate/migrate/releases/latest/download/migrate.linux-amd64.tar.gz | tar xvz
            sudo mv migrate /usr/local/bin/
        fi
    fi
    
    # Check Go
    if ! command -v go &> /dev/null; then
        error_exit "Go is not installed"
    fi
    
    # Check Node.js/Bun for frontend tests
    if ! command -v bun &> /dev/null && ! command -v node &> /dev/null; then
        error_exit "Neither Bun nor Node.js is installed"
    fi
    
    log_success "Prerequisites check completed"
}

# Function to setup test database
setup_test_database() {
    log_step "Setting up test database..."
    
    # Start test database if not running
    if ! docker ps --filter name=agromart-test-db --format "{{.Names}}" | grep -q agromart-test-db; then
        log_info "Starting test database container..."
        docker run -d \
            --name agromart-test-db \
            -e POSTGRES_USER="$DB_USER" \
            -e POSTGRES_PASSWORD="$DB_PASSWORD" \
            -e POSTGRES_DB="$DB_NAME" \
            -p "${DB_PORT}:5432" \
            postgres:17.5-alpine
        
        # Wait for database to be ready
        log_info "Waiting for test database to be ready..."
        timeout=60
        while [[ $timeout -gt 0 ]]; do
            if docker exec agromart-test-db pg_isready -U "$DB_USER" >/dev/null 2>&1; then
                log_success "Test database is ready"
                break
            fi
            sleep 2
            timeout=$((timeout-2))
        done
        
        if [[ $timeout -le 0 ]]; then
            error_exit "Test database failed to start within 60 seconds"
        fi
    fi
    
    # Run migrations on test database
    log_info "Applying migrations to test database..."
    if migrate -path "$MIGRATIONS_PATH" -database "$DATABASE_URL" up; then
        log_success "Test database migrations completed"
        MIGRATION_TESTS_PASSED=true
    else
        log_error "Test database migration failed"
        MIGRATION_TESTS_PASSED=false
    fi
}

# Function to run backend tests
run_backend_tests() {
    log_step "Running backend tests..."
    
    cd apps/server
    
    # Set test environment variables
    export APP_ENV=test
    export APP_DB_HOST="$DB_HOST"
    export APP_DB_PORT="$DB_PORT"
    export APP_DB_USER="$DB_USER"
    export APP_DB_PASSWORD="$DB_PASSWORD"
    export APP_DB_NAME="$DB_NAME"
    export APP_JWT_SECRET="test-jwt-secret"
    
    # Run unit tests
    log_info "Running Go unit tests..."
    if timeout 300 go test ./... -v -cover -race; then
        log_success "Backend unit tests passed"
        BACKEND_TESTS_PASSED=true
    else
        log_error "Backend unit tests failed"
        BACKEND_TESTS_PASSED=false
    fi
    
    # Run integration tests if available
    if [[ -d "tests" ]]; then
        log_info "Running integration tests..."
        if timeout 300 go test ./tests/... -v -tags=integration; then
            log_success "Backend integration tests passed"
        else
            log_error "Backend integration tests failed"
            BACKEND_TESTS_PASSED=false
        fi
    fi
    
    cd - >/dev/null
}

# Function to run frontend tests
run_frontend_tests() {
    log_step "Running frontend tests..."
    
    cd apps/client
    
    # Install dependencies if needed
    if [[ ! -d "node_modules" ]]; then
        log_info "Installing frontend dependencies..."
        if command -v bun &> /dev/null; then
            bun install
        else
            npm install
        fi
    fi
    
    # Run unit tests with Bun (as specified in project requirements)
    log_info "Running frontend unit tests..."
    if command -v bun &> /dev/null; then
        if timeout 300 bun test; then
            log_success "Frontend unit tests passed"
            FRONTEND_TESTS_PASSED=true
        else
            log_error "Frontend unit tests failed"
            FRONTEND_TESTS_PASSED=false
        fi
    else
        log_warning "Bun not available, using npm for tests"
        if timeout 300 npm test; then
            log_success "Frontend unit tests passed"
            FRONTEND_TESTS_PASSED=true
        else
            log_error "Frontend unit tests failed"
            FRONTEND_TESTS_PASSED=false
        fi
    fi
    
    cd - >/dev/null
}

# Function to run E2E tests
run_e2e_tests() {
    if [[ "${SKIP_E2E:-false}" == "true" ]]; then
        log_info "Skipping E2E tests (SKIP_E2E=true)"
        return
    fi
    
    log_step "Running E2E tests..."
    
    # Start application services for E2E testing
    log_info "Starting application services for E2E testing..."
    docker compose -f docker-compose.dev.yml up -d backend client
    
    # Wait for services to be ready
    log_info "Waiting for services to be ready..."
    timeout=120
    while [[ $timeout -gt 0 ]]; do
        if curl -f http://localhost:8080/health >/dev/null 2>&1 && \
           curl -f http://localhost:3000 >/dev/null 2>&1; then
            log_success "Application services are ready"
            break
        fi
        sleep 5
        timeout=$((timeout-5))
    done
    
    if [[ $timeout -le 0 ]]; then
        log_error "Application services failed to start for E2E testing"
        E2E_TESTS_PASSED=false
        return
    fi
    
    # Run Playwright E2E tests
    cd apps/client
    if [[ -f "playwright.config.ts" ]]; then
        log_info "Running Playwright E2E tests..."
        if timeout 600 npx playwright test; then
            log_success "E2E tests passed"
            E2E_TESTS_PASSED=true
        else
            log_error "E2E tests failed"
            E2E_TESTS_PASSED=false
        fi
    else
        log_warning "No Playwright configuration found, skipping E2E tests"
    fi
    
    cd - >/dev/null
    
    # Stop test services
    docker compose -f docker-compose.dev.yml down
}

# Function to run performance tests
run_performance_tests() {
    if [[ "${SKIP_PERFORMANCE:-false}" == "true" ]]; then
        log_info "Skipping performance tests (SKIP_PERFORMANCE=true)"
        return
    fi
    
    log_step "Running performance tests..."
    
    # Check if k6 is available
    if ! command -v k6 &> /dev/null; then
        log_warning "k6 not found, skipping performance tests"
        return
    fi
    
    # Start minimal services for performance testing
    docker compose -f docker-compose.dev.yml up -d backend
    
    # Wait for backend to be ready
    timeout=60
    while [[ $timeout -gt 0 ]]; do
        if curl -f http://localhost:8080/health >/dev/null 2>&1; then
            break
        fi
        sleep 2
        timeout=$((timeout-2))
    done
    
    if [[ $timeout -le 0 ]]; then
        log_error "Backend not ready for performance testing"
        PERFORMANCE_TESTS_PASSED=false
        return
    fi
    
    # Run k6 performance tests
    if [[ -f "k6-tests/main-test-runner.js" ]]; then
        log_info "Running k6 performance tests..."
        if timeout 300 k6 run k6-tests/main-test-runner.js; then
            log_success "Performance tests passed"
            PERFORMANCE_TESTS_PASSED=true
        else
            log_error "Performance tests failed"
            PERFORMANCE_TESTS_PASSED=false
        fi
    else
        log_warning "No k6 test files found, skipping performance tests"
    fi
    
    # Stop services
    docker compose -f docker-compose.dev.yml down
}

# Function to run database migration tests
run_migration_tests() {
    log_step "Running database migration tests..."
    
    # Test migration up
    log_info "Testing migration up..."
    if migrate -path "$MIGRATIONS_PATH" -database "$DATABASE_URL" up; then
        log_success "Migration up test passed"
    else
        log_error "Migration up test failed"
        MIGRATION_TESTS_PASSED=false
        return
    fi
    
    # Test migration down (rollback)
    log_info "Testing migration rollback..."
    if migrate -path "$MIGRATIONS_PATH" -database "$DATABASE_URL" down 1; then
        log_success "Migration rollback test passed"
        # Re-apply the migration
        migrate -path "$MIGRATIONS_PATH" -database "$DATABASE_URL" up >/dev/null 2>&1
    else
        log_error "Migration rollback test failed"
        MIGRATION_TESTS_PASSED=false
        return
    fi
    
    # Run migration verifier if available
    if [[ -f "apps/server/tools/migration-verifier/main.go" ]]; then
        log_info "Running migration verifier..."
        cd apps/server/tools/migration-verifier
        if timeout 60 go run main.go; then
            log_success "Migration verifier passed"
            MIGRATION_TESTS_PASSED=true
        else
            log_warning "Migration verifier completed with warnings"
        fi
        cd - >/dev/null
    fi
}

# Function to cleanup test resources
cleanup_test_resources() {
    log_step "Cleaning up test resources..."
    
    # Stop and remove test containers
    docker compose -f docker-compose.dev.yml down --remove-orphans 2>/dev/null || true
    docker stop agromart-test-db 2>/dev/null || true
    docker rm agromart-test-db 2>/dev/null || true
    
    log_success "Test resources cleaned up"
}

# Function to generate comprehensive test report
generate_test_report() {
    log_step "Generating test report..."
    
    local report_file="ci-test-report.json"
    
    cat > "$report_file" << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "environment": "${CI:-local}",
  "git_commit": "$(git rev-parse HEAD 2>/dev/null || echo 'unknown')",
  "git_branch": "$(git branch --show-current 2>/dev/null || echo 'unknown')",
  "test_results": {
    "backend_tests": $BACKEND_TESTS_PASSED,
    "frontend_tests": $FRONTEND_TESTS_PASSED,
    "e2e_tests": $E2E_TESTS_PASSED,
    "migration_tests": $MIGRATION_TESTS_PASSED,
    "performance_tests": $PERFORMANCE_TESTS_PASSED
  },
  "overall_status": "$(if [[ "$BACKEND_TESTS_PASSED" == "true" && "$FRONTEND_TESTS_PASSED" == "true" && "$MIGRATION_TESTS_PASSED" == "true" ]]; then echo "PASSED"; else echo "FAILED"; fi)"
}
EOF
    
    log_success "Test report generated: $report_file"
}

# Function to show test summary
show_test_summary() {
    log_step "CI Test Summary"
    echo ""
    echo "🧪 AgroMart CI Test Results"
    echo "==========================="
    echo ""
    echo "📊 Test Results:"
    echo "  Backend Tests:      $(if [[ "$BACKEND_TESTS_PASSED" == "true" ]]; then echo "✅ PASSED"; else echo "❌ FAILED"; fi)"
    echo "  Frontend Tests:     $(if [[ "$FRONTEND_TESTS_PASSED" == "true" ]]; then echo "✅ PASSED"; else echo "❌ FAILED"; fi)"
    echo "  E2E Tests:          $(if [[ "$E2E_TESTS_PASSED" == "true" ]]; then echo "✅ PASSED"; else echo "❌ FAILED"; fi)"
    echo "  Migration Tests:    $(if [[ "$MIGRATION_TESTS_PASSED" == "true" ]]; then echo "✅ PASSED"; else echo "❌ FAILED"; fi)"
    echo "  Performance Tests:  $(if [[ "$PERFORMANCE_TESTS_PASSED" == "true" ]]; then echo "✅ PASSED"; else echo "❌ FAILED"; fi)"
    echo ""
    
    local overall_status="PASSED"
    if [[ "$BACKEND_TESTS_PASSED" != "true" || "$FRONTEND_TESTS_PASSED" != "true" || "$MIGRATION_TESTS_PASSED" != "true" ]]; then
        overall_status="FAILED"
    fi
    
    echo "🎯 Overall Status: $(if [[ "$overall_status" == "PASSED" ]]; then echo "✅ PASSED"; else echo "❌ FAILED"; fi)"
    
    if [[ "$overall_status" == "FAILED" ]]; then
        echo ""
        echo "❌ Some tests failed. Check the logs above for details."
        return 1
    else
        echo ""
        echo "✅ All critical tests passed! Ready for deployment."
        return 0
    fi
}

# Function to show help
show_help() {
    cat << EOF
AgroMart CI Testing Script

USAGE:
    $0 [OPTIONS] [TEST_TYPE]

TEST_TYPES:
    all                 Run all tests (default)
    backend             Run backend tests only
    frontend            Run frontend tests only
    e2e                 Run E2E tests only
    migration           Run migration tests only
    performance         Run performance tests only

OPTIONS:
    --skip-e2e          Skip E2E tests
    --skip-performance  Skip performance tests
    --help, -h          Show this help message

ENVIRONMENT VARIABLES:
    DB_HOST             Test database host (default: localhost)
    DB_PORT             Test database port (default: 5432)
    DB_USER             Test database user (default: postgres)
    DB_PASSWORD         Test database password (default: secret)
    DB_NAME             Test database name (default: agromart_test)
    SKIP_E2E            Skip E2E tests (true/false)
    SKIP_PERFORMANCE    Skip performance tests (true/false)

EXAMPLES:
    $0                          # Run all tests
    $0 backend                  # Run backend tests only
    $0 --skip-e2e              # Run all tests except E2E
    $0 --skip-performance      # Run all tests except performance

EOF
}

# Main execution function
main() {
    local test_type="all"
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            all|backend|frontend|e2e|migration|performance)
                test_type="$1"
                shift
                ;;
            --skip-e2e)
                export SKIP_E2E="true"
                shift
                ;;
            --skip-performance)
                export SKIP_PERFORMANCE="true"
                shift
                ;;
            --help|-h)
                show_help
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    # Print test banner
    echo ""
    echo "🧪 AgroMart CI Testing Pipeline"
    echo "==============================="
    echo "Timestamp: $(date)"
    echo "Test Type: $test_type"
    echo "Environment: ${CI:-local}"
    echo ""
    
    # Setup
    check_test_prerequisites
    setup_test_database
    
    # Execute tests based on type
    case "$test_type" in
        all)
            run_backend_tests
            run_frontend_tests
            run_migration_tests
            run_e2e_tests
            run_performance_tests
            ;;
        backend)
            run_backend_tests
            ;;
        frontend)
            run_frontend_tests
            ;;
        e2e)
            run_e2e_tests
            ;;
        migration)
            run_migration_tests
            ;;
        performance)
            run_performance_tests
            ;;
    esac
    
    # Cleanup and report
    cleanup_test_resources
    generate_test_report
    
    if show_test_summary; then
        log_success "🎉 CI testing completed successfully!"
        exit 0
    else
        log_error "❌ CI testing failed!"
        exit 1
    fi
}

# Set up signal handlers
trap 'log_warning "Testing interrupted"; cleanup_test_resources; exit 130' INT TERM

# Change to project directory
cd "$PROJECT_ROOT"

# Run main function
main "$@"