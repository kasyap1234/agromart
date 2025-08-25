#!/bin/bash

# AgroMart Development Environment Startup Script
# Uses taskfile for database migrations and Docker Compose for services
#
# This script follows industry best practices for development environment setup:
# 1. Infrastructure first (DB + MinIO)
# 2. Database migrations via taskfile (dev:db:migrate)
# 3. Application services (Backend + Frontend)
# 4. Health checks and validation

set -e  # Exit on any error

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
COMPOSE_FILE="docker-compose.dev.yml"
MIGRATIONS_PATH="apps/server/sql/schema"

# Color codes for output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly PURPLE='\033[0;35m'
readonly NC='\033[0m' # No Color

# Database configuration for development
readonly DB_HOST="localhost"
readonly DB_PORT="5432"
readonly DB_USER="postgres"
readonly DB_PASSWORD="secret"
readonly DB_NAME="agromart"
readonly DATABASE_URL="postgres://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?sslmode=disable"

# Timeout configurations (in seconds)
readonly DB_TIMEOUT=60
readonly MINIO_TIMEOUT=60
readonly BACKEND_TIMEOUT=120
readonly FRONTEND_TIMEOUT=180

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
    log_error "Development startup failed. Check logs above for details."
    cleanup_on_error
    exit 1
}

cleanup_on_error() {
    log_warning "Performing cleanup..."
    docker compose -f "$COMPOSE_FILE" logs --tail=20 || true
    if [[ "${CLEANUP_ON_ERROR:-true}" == "true" ]]; then
        docker compose -f "$COMPOSE_FILE" down || true
    fi
}

# Function to check prerequisites
check_prerequisites() {
    log_step "Checking development prerequisites..."
    
    # Check Docker
    if ! docker info >/dev/null 2>&1; then
        error_exit "Docker is not running. Please start Docker Desktop."
    fi
    
    # Check Docker Compose
    if ! docker compose version >/dev/null 2>&1; then
        error_exit "Docker Compose is not available."
    fi
    
    # Check task CLI
    if ! command -v task &> /dev/null; then
        log_error "Task CLI not found!"
        log_info "Install with:"
        log_info "  macOS: brew install go-task"
        log_info "  Linux: curl -L https://github.com/go-task/task/releases/latest/download/task_linux_amd64.tar.gz | tar xvz && sudo mv task /usr/local/bin/"
        error_exit "Missing task CLI"
    fi
    # Check required files
    if [[ ! -f "$COMPOSE_FILE" ]]; then
        error_exit "Docker Compose file not found: $COMPOSE_FILE"
    fi
    
    if [[ ! -d "$MIGRATIONS_PATH" ]]; then
        error_exit "Migrations directory not found: $MIGRATIONS_PATH"
    fi
    
    # Validate migration files
    local up_files
    up_files=$(find "$MIGRATIONS_PATH" -name "*.up.sql" | wc -l | tr -d ' ')
    
    if [[ $up_files -eq 0 ]]; then
        error_exit "No migration files found in $MIGRATIONS_PATH"
    fi
    
    log_success "Prerequisites check completed ($up_files migrations found)"
}

# Function to cleanup existing containers (optional)
cleanup_existing() {
    if [[ "${CLEAN_START:-false}" == "true" ]]; then
        log_step "Cleaning up existing containers..."
        docker compose -f "$COMPOSE_FILE" down --volumes --remove-orphans --timeout 10 2>/dev/null || true
        docker container prune -f >/dev/null 2>&1 || true
        log_success "Cleanup completed"
    fi
}

# Function to start infrastructure services (DB + MinIO only)
start_infrastructure() {
    log_step "Starting infrastructure services (PostgreSQL + MinIO)..."
    
    # Start only database and MinIO first
    docker compose -f "$COMPOSE_FILE" up -d db minio
    
    # Wait for database with timeout
    log_info "Waiting for PostgreSQL database..."
    local timeout=$DB_TIMEOUT
    while [[ $timeout -gt 0 ]]; do
        if docker compose -f "$COMPOSE_FILE" exec -T db pg_isready -U postgres >/dev/null 2>&1; then
            log_success "Database is ready"
            break
        fi
        sleep 2
        timeout=$((timeout-2))
    done
    
    if [[ $timeout -le 0 ]]; then
        error_exit "Database failed to start within ${DB_TIMEOUT} seconds"
    fi
    
    # Wait for MinIO with timeout
    log_info "Waiting for MinIO..."
    timeout=$MINIO_TIMEOUT
    while [[ $timeout -gt 0 ]]; do
        if curl -f http://localhost:9000/minio/health/live >/dev/null 2>&1; then
            log_success "MinIO is ready"
            break
        fi
        sleep 2
        timeout=$((timeout-2))
    done
    
    if [[ $timeout -le 0 ]]; then
        error_exit "MinIO failed to start within ${MINIO_TIMEOUT} seconds"
    fi
    
    log_success "Infrastructure services are running"
}

# Function to run database migrations using taskfile
run_migrations() {
    log_step "Running database migrations with taskfile..."

    # Check if task is available
    if ! command -v task &> /dev/null; then
        log_error "Task not found!"
        log_info "Install with:"
        log_info "  macOS: brew install go-task"
        log_info "  Linux: curl -L https://github.com/go-task/task/releases/latest/download/task_linux_amd64.tar.gz | tar xvz && sudo mv task /usr/local/bin/"
        error_exit "Missing task CLI"
    fi

    # Apply all pending migrations using task
    log_info "Applying database migrations..."
    if task dev:db:migrate; then
        log_success "Database migrations completed successfully"
    else
        error_exit "Database migration failed"
    fi

    # Show final migration status
    local version
    version=$(migrate -path "$MIGRATIONS_PATH" -database "$DATABASE_URL" version 2>/dev/null | tail -n1 | awk '{print $1}') || true

    if [[ -n "$version" ]]; then
        log_success "Current migration version: $version"
    else
        log_warning "Could not determine migration version"
    fi

    # Run migration verifier if available
    if [[ -f "apps/server/tools/migration-verifier/main.go" ]]; then
        log_info "Running migration verifier..."
        cd apps/server/tools/migration-verifier
        if timeout 60 go run main.go; then
            log_success "Migration verification passed"
        else
            log_warning "Migration verification completed with warnings"
        fi
        cd - >/dev/null
    fi


# Function to start application services
start_application() {
    log_step "Starting application services (Backend + Frontend)..."
    
    # Create modified Docker Compose without migration logic in backend
    log_info "Starting backend service..."
    docker compose -f "$COMPOSE_FILE" up -d backend
    
    # Wait for backend health
    log_info "Waiting for backend API..."
    local timeout=$BACKEND_TIMEOUT
    while [[ $timeout -gt 0 ]]; do
        if curl -f http://localhost:8080/health >/dev/null 2>&1; then
            log_success "Backend API is ready"
            break
        fi
        sleep 3
        timeout=$((timeout-3))
    done
    
    if [[ $timeout -le 0 ]]; then
        log_error "Backend failed to start within ${BACKEND_TIMEOUT} seconds"
        log_info "Backend logs:"
        docker compose -f "$COMPOSE_FILE" logs backend --tail=20
        error_exit "Backend startup failed"
    fi
    
    # Start frontend
    log_info "Starting frontend service..."
    docker compose -f "$COMPOSE_FILE" up -d client
    
    # Wait for frontend
    log_info "Waiting for frontend..."
    timeout=$FRONTEND_TIMEOUT
    while [[ $timeout -gt 0 ]]; do
        if curl -f http://localhost:3000 >/dev/null 2>&1; then
            log_success "Frontend is ready"
            break
        fi
        sleep 5
        timeout=$((timeout-5))
    done
    
    if [[ $timeout -le 0 ]]; then
        log_error "Frontend failed to start within ${FRONTEND_TIMEOUT} seconds"
        log_info "Frontend logs:"
        docker compose -f "$COMPOSE_FILE" logs client --tail=20
        error_exit "Frontend startup failed"
    fi
    
    log_success "Application services are running"
}

# Function to run development health checks
run_health_checks() {
    log_step "Running development health checks..."
    
    # Database connectivity
    if psql "$DATABASE_URL" -c "SELECT 1;" >/dev/null 2>&1; then
        log_success "Database connectivity: OK"
    else
        log_warning "psql not available for database test"
    fi
    
    # Backend API endpoints
    local endpoints=("/health" "/api/auth/me")
    for endpoint in "${endpoints[@]}"; do
        if curl -f "http://localhost:8080${endpoint}" >/dev/null 2>&1; then
            log_success "Backend endpoint $endpoint: OK"
        else
            log_warning "Backend endpoint $endpoint: Not accessible (may require auth)"
        fi
    done
    
    # MinIO health
    if curl -f http://localhost:9000/minio/health/live >/dev/null 2>&1; then
        log_success "MinIO health: OK"
    else
        log_warning "MinIO health check failed"
    fi
    
    # Frontend accessibility
    if curl -f http://localhost:3000 >/dev/null 2>&1; then
        log_success "Frontend accessibility: OK"
    else
        log_warning "Frontend accessibility check failed"
    fi
    
    log_success "Health checks completed"
}

# Function to show development environment status
show_dev_status() {
    log_step "Development Environment Status"
    echo ""
    echo "🚀 AgroMart Development Environment"
    echo "=================================="
    echo ""
    echo "📊 Service URLs:"
    echo "  🌐 Frontend:      http://localhost:3000"
    echo "  🔗 Backend API:   http://localhost:8080"
    echo "  📋 API Health:   http://localhost:8080/health"
    echo "  🗄️  Database:     localhost:5432 (postgres/secret)"
    echo "  📁 MinIO Console: http://localhost:9001 (minioadmin/minioadmin)"
    echo "  📁 MinIO API:     http://localhost:9000"
    echo ""
    echo "🔧 Development Commands:"
    echo "  📜 View logs:     docker compose -f $COMPOSE_FILE logs [service]"
    echo "  🛑 Stop all:      docker compose -f $COMPOSE_FILE down"
    echo "  🔄 Restart:       docker compose -f $COMPOSE_FILE restart [service]"
    echo "  📊 Status:        docker compose -f $COMPOSE_FILE ps"
    echo ""
    echo "📈 Migration Status:"
    migrate -path "$MIGRATIONS_PATH" -database "$DATABASE_URL" version 2>/dev/null || echo "  Could not determine migration status"
    echo ""
    echo "📦 Container Status:"
    docker compose -f "$COMPOSE_FILE" ps
}

# Function to handle script interruption
handle_interrupt() {
    log_warning "Received interrupt signal"
    if [[ "${AUTO_CLEANUP:-false}" == "true" ]]; then
        log_info "Auto-cleanup enabled, stopping services..."
        docker compose -f "$COMPOSE_FILE" down --timeout 10
    else
        log_info "Services are still running. Use 'docker compose -f $COMPOSE_FILE down' to stop them."
    fi
    exit 130
}

# Function to show help
show_help() {
    cat << EOF
AgroMart Development Environment Startup Script

USAGE:
    $0 [OPTIONS]

OPTIONS:
    --clean                Clean up existing containers before starting
    --no-health-checks     Skip health checks after startup
    --cleanup-on-error     Cleanup containers if startup fails (default: true)
    --auto-cleanup         Automatically cleanup on script interruption
    --help, -h             Show this help message

EXAMPLES:
    $0                          # Standard development startup
    $0 --clean                  # Clean start (removes existing containers)
    $0 --auto-cleanup           # Auto cleanup on interrupt
    
DESCRIPTION:
    This script provides complete development environment setup following DevOps best practices:
    
    1. 🔍 Prerequisites check (Docker, task CLI)
    2. 🚀 Infrastructure startup (PostgreSQL + MinIO)
    3. 📊 Database migrations via taskfile (dev:db:migrate)
    4. 🔧 Application services startup (Backend + Frontend)
    5. ✅ Health checks and validation
    6. 📋 Development environment status

EOF
}

# Main execution function
main() {
    local skip_health=false
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --clean)
                export CLEAN_START="true"
                shift
                ;;
            --no-health-checks)
                skip_health=true
                shift
                ;;
            --cleanup-on-error)
                export CLEANUP_ON_ERROR="true"
                shift
                ;;
            --auto-cleanup)
                export AUTO_CLEANUP="true"
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
    
    # Print startup banner
    echo ""
    echo "🚀 AgroMart Development Environment Startup"
    echo "==========================================="
    echo "Timestamp: $(date)"
    echo "Mode: Development with External Migration Management"
    echo "Compose File: $COMPOSE_FILE"
    echo "Migrations Path: $MIGRATIONS_PATH"
    echo ""
    
    # Execute development pipeline steps
    check_prerequisites
    cleanup_existing
    start_infrastructure
    run_migrations
    start_application
    
    if [[ "$skip_health" != "true" ]]; then
        run_health_checks
    fi
    
    show_dev_status
    
    echo ""
    log_success "🎉 AgroMart development environment ready!"
    log_info "Happy coding! 🚀"
    
    if [[ "${AUTO_CLEANUP:-false}" != "true" ]]; then
        log_info "Services will continue running. Use './scripts/dev-stop.sh' to stop them."
    fi
}

# Set up signal handlers
trap handle_interrupt INT TERM

# Change to project directory
cd "$PROJECT_ROOT"

# Run main function
main 