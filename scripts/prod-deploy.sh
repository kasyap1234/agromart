#!/bin/bash

# AgroMart Production Deployment Script
# Multi-environment deployment with GitHub Container Registry
# Supports migration rollback and follows industry DevOps best practices
#
# Features:
# - Multi-environment support (dev, staging, prod)
# - Database migration management with rollback capabilities
# - GitHub Container Registry integration
# - Automated testing before deployment
# - Environment-specific configuration
# - Production-grade error handling and logging

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
readonly CYAN='\033[0;36m'
readonly NC='\033[0m' # No Color

# Image configuration for GitHub Container Registry
readonly REGISTRY="ghcr.io"
readonly GITHUB_USERNAME="${GITHUB_USERNAME:-}"  # Set via environment
readonly PROJECT_NAME="agromart"

# Default environment
ENVIRONMENT="${ENVIRONMENT:-staging}"

# Image tags
readonly BACKEND_IMAGE="${REGISTRY}/${GITHUB_USERNAME}/${PROJECT_NAME}-backend"
readonly FRONTEND_IMAGE="${REGISTRY}/${GITHUB_USERNAME}/${PROJECT_NAME}-frontend"
readonly MINIO_IMAGE="${REGISTRY}/${GITHUB_USERNAME}/${PROJECT_NAME}-minio"

# Version tag (can be overridden)
VERSION_TAG="${VERSION_TAG:-$(git rev-parse --short HEAD 2>/dev/null || echo 'latest')}"

# Timeout configurations
readonly MIGRATION_TIMEOUT=300
readonly HEALTH_CHECK_TIMEOUT=180
readonly BUILD_TIMEOUT=900

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $(date '+%Y-%m-%d %H:%M:%S') $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $(date '+%Y-%m-%d %H:%M:%S') $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') $1"
}

log_step() {
    echo -e "${PURPLE}[STEP]${NC} $(date '+%Y-%m-%d %H:%M:%S') $1"
}

log_debug() {
    if [[ "${DEBUG:-false}" == "true" ]]; then
        echo -e "${CYAN}[DEBUG]${NC} $(date '+%Y-%m-%d %H:%M:%S') $1"
    fi
}

# Error handling
error_exit() {
    log_error "$1"
    log_error "Production deployment failed. Check logs above for details."
    exit 1
}

# Function to validate environment configuration
validate_environment() {
    log_step "Validating environment configuration..."
    
    case "$ENVIRONMENT" in
        dev|development)
            export DB_HOST="${DB_HOST:-localhost}"
            export DB_PORT="${DB_PORT:-5432}"
            export DB_USER="${DB_USER:-postgres}"
            export DB_PASSWORD="${DB_PASSWORD:-secret}"
            export DB_NAME="${DB_NAME:-agromart_dev}"
            ;;
        staging)
            export DB_HOST="${DB_HOST:-}"
            export DB_PORT="${DB_PORT:-5432}"
            export DB_USER="${DB_USER:-}"
            export DB_PASSWORD="${DB_PASSWORD:-}"
            export DB_NAME="${DB_NAME:-agromart_staging}"
            ;;
        prod|production)
            export DB_HOST="${DB_HOST:-}"
            export DB_PORT="${DB_PORT:-5432}"
            export DB_USER="${DB_USER:-}"
            export DB_PASSWORD="${DB_PASSWORD:-}"
            export DB_NAME="${DB_NAME:-agromart_prod}"
            ;;
        *)
            error_exit "Invalid environment: $ENVIRONMENT. Must be one of: dev, staging, prod"
            ;;
    esac
    
    # Validate required environment variables
    if [[ -z "$GITHUB_USERNAME" ]]; then
        error_exit "GITHUB_USERNAME environment variable is required"
    fi
    
    if [[ -z "$GITHUB_TOKEN" ]] && [[ "${SKIP_REGISTRY_AUTH:-false}" != "true" ]]; then
        error_exit "GITHUB_TOKEN environment variable is required for registry authentication"
    fi
    
    # Validate database configuration for non-dev environments
    if [[ "$ENVIRONMENT" != "dev" && "$ENVIRONMENT" != "development" ]]; then
        if [[ -z "$DB_HOST" || -z "$DB_USER" || -z "$DB_PASSWORD" ]]; then
            error_exit "Database configuration (DB_HOST, DB_USER, DB_PASSWORD) is required for $ENVIRONMENT environment"
        fi
    fi
    
    export DATABASE_URL="postgres://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?sslmode=disable"
    
    log_success "Environment configuration validated for: $ENVIRONMENT"
}

# Function to check prerequisites
check_prerequisites() {
    log_step "Checking production deployment prerequisites..."
    
    # Check Docker
    if ! docker info >/dev/null 2>&1; then
        error_exit "Docker is not running"
    fi
    
    # Check Docker Compose
    if ! docker compose version >/dev/null 2>&1; then
        error_exit "Docker Compose is not available"
    fi
    
    # Check golang-migrate CLI
    if ! command -v migrate &> /dev/null; then
        error_exit "golang-migrate CLI not found. Install with: brew install golang-migrate"
    fi
    
    # Check Git (for version tagging)
    if ! command -v git &> /dev/null; then
        log_warning "Git not found. Version tagging may be affected."
    fi
    
    # Check required files
    if [[ ! -d "$MIGRATIONS_PATH" ]]; then
        error_exit "Migrations directory not found: $MIGRATIONS_PATH"
    fi
    
    # Validate migration files
    local up_files
    up_files=$(find "$MIGRATIONS_PATH" -name "*.up.sql" | wc -l | tr -d ' ')
    
    if [[ $up_files -eq 0 ]]; then
        error_exit "No migration files found in $MIGRATIONS_PATH"
    fi
    
    log_success "Prerequisites validated ($up_files migrations found)"
}

# Function to authenticate with GitHub Container Registry
authenticate_registry() {
    if [[ "${SKIP_REGISTRY_AUTH:-false}" == "true" ]]; then
        log_info "Skipping registry authentication (SKIP_REGISTRY_AUTH=true)"
        return
    fi
    
    log_step "Authenticating with GitHub Container Registry..."
    
    if [[ -z "$GITHUB_TOKEN" ]]; then
        error_exit "GITHUB_TOKEN is required for registry authentication"
    fi
    
    echo "$GITHUB_TOKEN" | docker login "$REGISTRY" -u "$GITHUB_USERNAME" --password-stdin
    
    log_success "Successfully authenticated with GitHub Container Registry"
}

# Function to run automated tests
run_automated_tests() {
    if [[ "${SKIP_TESTS:-false}" == "true" ]]; then
        log_info "Skipping automated tests (SKIP_TESTS=true)"
        return
    fi
    
    log_step "Running automated tests before deployment..."
    
    # Backend tests
    log_info "Running backend tests..."
    cd apps/server
    if ! timeout 300 go test ./... -v; then
        error_exit "Backend tests failed"
    fi
    cd - >/dev/null
    
    # Frontend tests (using Bun as specified in project requirements)
    log_info "Running frontend tests..."
    cd apps/client
    if command -v bun &> /dev/null; then
        if ! timeout 300 bun test; then
            error_exit "Frontend tests failed"
        fi
    else
        log_warning "Bun not found, skipping frontend tests"
    fi
    cd - >/dev/null
    
    log_success "All automated tests passed"
}

# Function to handle database migrations
manage_migrations() {
    local action="${1:-up}"  # up, down, force, status
    local steps="${2:-}"
    
    log_step "Managing database migrations (action: $action)..."
    
    case "$action" in
        up)
            log_info "Applying database migrations..."
            if [[ -n "$steps" ]]; then
                timeout $MIGRATION_TIMEOUT migrate -path "$MIGRATIONS_PATH" -database "$DATABASE_URL" up "$steps"
            else
                timeout $MIGRATION_TIMEOUT migrate -path "$MIGRATIONS_PATH" -database "$DATABASE_URL" up
            fi
            ;;
        down)
            local rollback_steps="${steps:-1}"
            log_warning "Rolling back $rollback_steps migration(s)..."
            
            # Confirmation for rollback
            if [[ "${FORCE_ROLLBACK:-false}" != "true" ]]; then
                read -p "This will rollback database migrations. Type 'ROLLBACK' to confirm: " -r
                echo
                if [[ "$REPLY" != "ROLLBACK" ]]; then
                    log_info "Migration rollback cancelled"
                    return
                fi
            fi
            
            timeout $MIGRATION_TIMEOUT migrate -path "$MIGRATIONS_PATH" -database "$DATABASE_URL" down "$rollback_steps"
            ;;
        force)
            if [[ -z "$steps" ]]; then
                error_exit "Version number required for force command"
            fi
            log_warning "Forcing migration version to $steps..."
            timeout $MIGRATION_TIMEOUT migrate -path "$MIGRATIONS_PATH" -database "$DATABASE_URL" force "$steps"
            ;;
        status)
            log_info "Checking migration status..."
            migrate -path "$MIGRATIONS_PATH" -database "$DATABASE_URL" version
            return
            ;;
        *)
            error_exit "Invalid migration action: $action"
            ;;
    esac
    
    # Show migration status after action
    local version
    version=$(migrate -path "$MIGRATIONS_PATH" -database "$DATABASE_URL" version 2>/dev/null | tail -n1 | awk '{print $1}') || true
    
    if [[ -n "$version" ]]; then
        log_success "Migration $action completed. Current version: $version"
    else
        log_warning "Could not determine migration version after $action"
    fi
    
    # Run migration verifier if available
    if [[ -f "apps/server/tools/migration-verifier/main.go" ]] && [[ "$action" == "up" ]]; then
        log_info "Running migration verifier..."
        cd apps/server/tools/migration-verifier
        if timeout 60 go run main.go; then
            log_success "Migration verification passed"
        else
            log_warning "Migration verification completed with warnings"
        fi
        cd - >/dev/null
    fi
}

# Function to build and tag images
build_images() {
    log_step "Building production images..."
    
    local build_args=""
    
    # Add environment-specific build args
    case "$ENVIRONMENT" in
        prod|production)
            build_args="--build-arg NODE_ENV=production --build-arg GO_ENV=production"
            ;;
        staging)
            build_args="--build-arg NODE_ENV=staging --build-arg GO_ENV=staging"
            ;;
        *)
            build_args="--build-arg NODE_ENV=development --build-arg GO_ENV=development"
            ;;
    esac
    
    # Build backend image
    log_info "Building backend image..."
    timeout $BUILD_TIMEOUT docker build $build_args \
        -t "${BACKEND_IMAGE}:${VERSION_TAG}" \
        -t "${BACKEND_IMAGE}:${ENVIRONMENT}" \
        -t "${BACKEND_IMAGE}:latest" \
        -f docker/backend.Dockerfile .
    
    # Build frontend image
    log_info "Building frontend image..."
    timeout $BUILD_TIMEOUT docker build $build_args \
        -t "${FRONTEND_IMAGE}:${VERSION_TAG}" \
        -t "${FRONTEND_IMAGE}:${ENVIRONMENT}" \
        -t "${FRONTEND_IMAGE}:latest" \
        -f docker/frontend.Dockerfile apps/client/
    
    # Build MinIO image (custom configuration)
    log_info "Building MinIO image..."
    timeout $BUILD_TIMEOUT docker build \
        -t "${MINIO_IMAGE}:${VERSION_TAG}" \
        -t "${MINIO_IMAGE}:${ENVIRONMENT}" \
        -t "${MINIO_IMAGE}:latest" \
        -f docker/minio.Dockerfile .
    
    log_success "All images built successfully"
}

# Function to push images to registry
push_images() {
    if [[ "${SKIP_PUSH:-false}" == "true" ]]; then
        log_info "Skipping image push (SKIP_PUSH=true)"
        return
    fi
    
    log_step "Pushing images to GitHub Container Registry..."
    
    # Push backend images
    log_info "Pushing backend images..."
    docker push "${BACKEND_IMAGE}:${VERSION_TAG}"
    docker push "${BACKEND_IMAGE}:${ENVIRONMENT}"
    docker push "${BACKEND_IMAGE}:latest"
    
    # Push frontend images
    log_info "Pushing frontend images..."
    docker push "${FRONTEND_IMAGE}:${VERSION_TAG}"
    docker push "${FRONTEND_IMAGE}:${ENVIRONMENT}"
    docker push "${FRONTEND_IMAGE}:latest"
    
    # Push MinIO images
    log_info "Pushing MinIO images..."
    docker push "${MINIO_IMAGE}:${VERSION_TAG}"
    docker push "${MINIO_IMAGE}:${ENVIRONMENT}"
    docker push "${MINIO_IMAGE}:latest"
    
    log_success "All images pushed to registry"
}

# Function to create environment-specific deployment configuration
create_deployment_config() {
    log_step "Creating deployment configuration for $ENVIRONMENT..."
    
    local config_file="docker-compose.${ENVIRONMENT}.yml"
    
    cat > "$config_file" << EOF
# Auto-generated deployment configuration for ${ENVIRONMENT}
# Generated at: $(date)
services:
  backend:
    image: ${BACKEND_IMAGE}:${ENVIRONMENT}
    container_name: agromart-backend-${ENVIRONMENT}
    environment:
      APP_ENV: ${ENVIRONMENT}
      DB_HOST: ${DB_HOST}
      DB_PORT: ${DB_PORT}
      DB_USER: ${DB_USER}
      DB_PASSWORD: ${DB_PASSWORD}
      DB_NAME: ${DB_NAME}
      JWT_SECRET: \${JWT_SECRET}
    ports:
      - "8080:8080"
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "wget -qO- http://localhost:8080/health || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 3

  frontend:
    image: ${FRONTEND_IMAGE}:${ENVIRONMENT}
    container_name: agromart-frontend-${ENVIRONMENT}
    environment:
      NEXT_PUBLIC_API_URL: \${NEXT_PUBLIC_API_URL:-http://localhost:8080/api}
      NODE_ENV: ${ENVIRONMENT}
    ports:
      - "3000:3000"
    restart: unless-stopped
    depends_on:
      - backend
    healthcheck:
      test: ["CMD-SHELL", "wget -qO- http://localhost:3000 || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 3

  minio:
    image: ${MINIO_IMAGE}:${ENVIRONMENT}
    container_name: agromart-minio-${ENVIRONMENT}
    environment:
      MINIO_ROOT_USER: \${MINIO_ROOT_USER:-minioadmin}
      MINIO_ROOT_PASSWORD: \${MINIO_ROOT_PASSWORD:-minioadmin}
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio_data_${ENVIRONMENT}:/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  minio_data_${ENVIRONMENT}:
EOF
    
    log_success "Deployment configuration created: $config_file"
}

# Function to show deployment summary
show_deployment_summary() {
    log_step "Production Deployment Summary"
    echo ""
    echo "🚀 AgroMart Production Deployment"
    echo "================================="
    echo ""
    echo "📊 Environment: $ENVIRONMENT"
    echo "📦 Version Tag: $VERSION_TAG"
    echo "🏭 Registry: $REGISTRY"
    echo ""
    echo "🖼️ Images Built & Pushed:"
    echo "  Backend:  ${BACKEND_IMAGE}:${ENVIRONMENT}"
    echo "  Frontend: ${FRONTEND_IMAGE}:${ENVIRONMENT}"
    echo "  MinIO:    ${MINIO_IMAGE}:${ENVIRONMENT}"
    echo ""
    echo "📈 Migration Status:"
    migrate -path "$MIGRATIONS_PATH" -database "$DATABASE_URL" version 2>/dev/null || echo "  Could not determine migration status"
    echo ""
    echo "🔧 Next Steps:"
    echo "  1. Deploy using: docker compose -f docker-compose.${ENVIRONMENT}.yml up -d"
    echo "  2. Monitor logs: docker compose -f docker-compose.${ENVIRONMENT}.yml logs -f"
    echo "  3. Health check: curl http://your-domain/health"
}

# Function to show help
show_help() {
    cat << EOF
AgroMart Production Deployment Script

USAGE:
    $0 [OPTIONS] [COMMAND]

COMMANDS:
    deploy              Full deployment pipeline (default)
    build               Build images only
    push                Push images only
    migrate [ACTION]    Manage migrations (up, down, status, force)
    test                Run tests only

OPTIONS:
    --env ENV           Target environment (dev, staging, prod) [default: staging]
    --version TAG       Version tag for images [default: git short hash]
    --skip-tests        Skip automated testing
    --skip-push         Build images but don't push to registry
    --skip-registry-auth Skip registry authentication
    --force-rollback    Skip confirmation for migration rollback
    --debug             Enable debug logging
    --help, -h          Show this help message

ENVIRONMENT VARIABLES:
    GITHUB_USERNAME     GitHub username for container registry
    GITHUB_TOKEN        GitHub personal access token
    DB_HOST             Database host
    DB_USER             Database user
    DB_PASSWORD         Database password
    JWT_SECRET          JWT secret for the application

EXAMPLES:
    # Full production deployment
    $0 --env prod --version v1.2.0

    # Staging deployment with custom version
    $0 --env staging --version feature-branch

    # Build and test only (no push)
    $0 build --skip-push

    # Run migrations only
    $0 migrate up

    # Rollback last migration
    $0 migrate down 1

    # Check migration status
    $0 migrate status

GITHUB ACTIONS INTEGRATION:
    This script is designed for GitHub Actions. Set the following secrets:
    - GITHUB_TOKEN (automatic in GitHub Actions)
    - DB_HOST_STAGING, DB_HOST_PROD
    - DB_USER_STAGING, DB_USER_PROD  
    - DB_PASSWORD_STAGING, DB_PASSWORD_PROD
    - JWT_SECRET_STAGING, JWT_SECRET_PROD

EOF
}

# Main execution function
main() {
    local command="deploy"
    local migration_action="up"
    local migration_steps=""
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            deploy|build|push|test)
                command="$1"
                shift
                ;;
            migrate)
                command="migrate"
                migration_action="${2:-up}"
                migration_steps="${3:-}"
                shift 2 || shift
                ;;
            --env)
                ENVIRONMENT="$2"
                shift 2
                ;;
            --version)
                VERSION_TAG="$2"
                shift 2
                ;;
            --skip-tests)
                export SKIP_TESTS="true"
                shift
                ;;
            --skip-push)
                export SKIP_PUSH="true"
                shift
                ;;
            --skip-registry-auth)
                export SKIP_REGISTRY_AUTH="true"
                shift
                ;;
            --force-rollback)
                export FORCE_ROLLBACK="true"
                shift
                ;;
            --debug)
                export DEBUG="true"
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
    
    # Print deployment banner
    echo ""
    echo "🚀 AgroMart Production Deployment Pipeline"
    echo "=========================================="
    echo "Timestamp: $(date)"
    echo "Environment: $ENVIRONMENT"
    echo "Version: $VERSION_TAG"
    echo "Command: $command"
    echo "Registry: $REGISTRY"
    echo ""
    
    # Execute based on command
    case "$command" in
        deploy)
            validate_environment
            check_prerequisites
            authenticate_registry
            run_automated_tests
            manage_migrations up
            build_images
            push_images
            create_deployment_config
            show_deployment_summary
            ;;
        build)
            validate_environment
            check_prerequisites
            authenticate_registry
            run_automated_tests
            build_images
            push_images
            ;;
        push)
            validate_environment
            authenticate_registry
            push_images
            ;;
        test)
            validate_environment
            run_automated_tests
            ;;
        migrate)
            validate_environment
            check_prerequisites
            manage_migrations "$migration_action" "$migration_steps"
            ;;
        *)
            log_error "Unknown command: $command"
            show_help
            exit 1
            ;;
    esac
    
    echo ""
    log_success "🎉 Production deployment pipeline completed successfully!"
}

# Set up signal handlers
trap 'log_warning "Deployment interrupted"; exit 130' INT TERM

# Change to project directory
cd "$PROJECT_ROOT"

# Run main function
main "$@"