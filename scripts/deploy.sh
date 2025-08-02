#!/bin/bash

# AgroMart Deployment Script
# Usage: ./scripts/deploy.sh [environment]
# Environment: dev, staging, prod, test (default: dev)

set -e

ENVIRONMENT=${1:-dev}
PROJECT_NAME="agromart"

echo "🚀 Starting deployment for environment: $ENVIRONMENT"

# Color codes for output
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

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if Docker Compose is available
if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is not installed. Please install it and try again."
    exit 1
fi

# Set environment-specific variables
case $ENVIRONMENT in
    "dev")
        COMPOSE_FILE="docker-compose.yml"
        ENV_FILE=".env.example"
        ;;
    "staging")
        COMPOSE_FILE="docker-compose.prod.yml"
        ENV_FILE=".env.staging"
        ;;
    "prod")
        COMPOSE_FILE="docker-compose.prod.yml"
        ENV_FILE=".env.production"
        ;;
    "test")
        COMPOSE_FILE="docker-compose.prod.yml"
        ENV_FILE=".env.test"
        ;;
    *)
        print_error "Invalid environment: $ENVIRONMENT. Use dev, staging, prod, or test."
        exit 1
        ;;
esac

# Check if environment file exists
if [ ! -f "$ENV_FILE" ]; then
    print_error "Environment file $ENV_FILE not found!"
    if [ "$ENVIRONMENT" = "dev" ]; then
        print_warning "Creating .env file from .env.example..."
        cp .env.example .env
        ENV_FILE=".env"
    else
        print_error "Please create $ENV_FILE with appropriate values."
        exit 1
    fi
fi

print_status "Using compose file: $COMPOSE_FILE"
print_status "Using environment file: $ENV_FILE"

# Load environment variables
export $(grep -v '^#' $ENV_FILE | xargs)

# Validate required environment variables
required_vars=("APP_DB_USER" "APP_DB_PASSWORD" "APP_DB_NAME" "JWT_SECRET")
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        print_error "Required environment variable $var is not set in $ENV_FILE"
        exit 1
    fi
done

# Security check for production
if [ "$ENVIRONMENT" = "prod" ]; then
    if [ "$JWT_SECRET" = "CHANGE_ME_TO_A_SECURE_64_CHARACTER_SECRET_KEY_IN_PRODUCTION" ]; then
        print_error "JWT_SECRET must be changed for production deployment!"
        exit 1
    fi
    
    if [ "$APP_DB_PASSWORD" = "CHANGE_ME_IN_PRODUCTION" ]; then
        print_error "APP_DB_PASSWORD must be changed for production deployment!"
        exit 1
    fi
fi

# Build and deploy
print_status "Building Docker images..."
docker-compose -f $COMPOSE_FILE build --no-cache

print_status "Starting services..."
docker-compose -f $COMPOSE_FILE up -d

# Wait for services to be healthy
print_status "Waiting for services to be healthy..."
sleep 30

# Check service health
print_status "Checking service health..."

# Check database
if docker-compose -f $COMPOSE_FILE exec -T db pg_isready -U $APP_DB_USER > /dev/null 2>&1; then
    print_status "✅ Database is healthy"
else
    print_error "❌ Database health check failed"
    docker-compose -f $COMPOSE_FILE logs db
    exit 1
fi

# Check backend
if curl -f http://localhost:${APP_PORT:-8080}/health > /dev/null 2>&1; then
    print_status "✅ Backend is healthy"
else
    print_warning "⚠️  Backend health check failed, checking logs..."
    docker-compose -f $COMPOSE_FILE logs backend
fi

# Check frontend (if not production with nginx)
if [ "$ENVIRONMENT" != "prod" ] && [ "$ENVIRONMENT" != "test" ]; then
    if curl -f http://localhost:${FRONTEND_PORT:-3000} > /dev/null 2>&1; then
        print_status "✅ Frontend is healthy"
    else
        print_warning "⚠️  Frontend health check failed, checking logs..."
        docker-compose -f $COMPOSE_FILE logs frontend
    fi
fi

# Run database migrations
print_status "Running database migrations..."
if [ -f "apps/server/sql/schema" ]; then
    docker-compose -f $COMPOSE_FILE exec -T backend sh -c "
        if command -v migrate &> /dev/null; then
            migrate -path /root/sql/schema -database postgres://$APP_DB_USER:$APP_DB_PASSWORD@db:5432/$APP_DB_NAME?sslmode=disable up
        else
            echo 'Migration tool not available in container'
        fi
    " || print_warning "Migration failed or tool not available"
fi

print_status "🎉 Deployment completed successfully!"
print_status "Services are running:"

if [ "$ENVIRONMENT" = "prod" ] || [ "$ENVIRONMENT" = "test" ]; then
    print_status "  - Application: http://localhost (via Nginx)"
    print_status "  - API: http://localhost/api"
else
    print_status "  - Frontend: http://localhost:${FRONTEND_PORT:-3000}"
    print_status "  - Backend: http://localhost:${APP_PORT:-8080}"
    print_status "  - API Health: http://localhost:${APP_PORT:-8080}/health"
fi

print_status "To view logs: docker-compose -f $COMPOSE_FILE logs -f"
print_status "To stop services: docker-compose -f $COMPOSE_FILE down"