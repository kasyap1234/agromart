#!/bin/bash

# AgroMart Database Backup Script
# Usage: ./scripts/backup.sh [environment]

set -e

ENVIRONMENT=${1:-dev}
BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Set environment-specific variables
case $ENVIRONMENT in
    "dev")
        COMPOSE_FILE="docker-compose.yml"
        ENV_FILE=".env"
        ;;
    "staging")
        COMPOSE_FILE="docker-compose.prod.yml"
        ENV_FILE=".env.staging"
        ;;
    "prod")
        COMPOSE_FILE="docker-compose.prod.yml"
        ENV_FILE=".env.production"
        ;;
    *)
        print_error "Invalid environment: $ENVIRONMENT. Use dev, staging, or prod."
        exit 1
        ;;
esac

# Check if environment file exists
if [ ! -f "$ENV_FILE" ]; then
    print_error "Environment file $ENV_FILE not found!"
    exit 1
fi

# Load environment variables
export $(grep -v '^#' $ENV_FILE | xargs)

# Create backup directory
mkdir -p $BACKUP_DIR

print_status "Starting database backup for environment: $ENVIRONMENT"

# Check if database container is running
if ! docker-compose -f $COMPOSE_FILE ps db | grep -q "Up"; then
    print_error "Database container is not running!"
    exit 1
fi

# Create backup filename
BACKUP_FILE="$BACKUP_DIR/agromart_${ENVIRONMENT}_${TIMESTAMP}.sql"

print_status "Creating backup: $BACKUP_FILE"

# Create database backup
docker-compose -f $COMPOSE_FILE exec -T db pg_dump \
    -U $APP_DB_USER \
    -d $APP_DB_NAME \
    --no-password \
    --verbose \
    --clean \
    --if-exists \
    --create > $BACKUP_FILE

if [ $? -eq 0 ]; then
    print_status "✅ Backup created successfully: $BACKUP_FILE"
    
    # Compress the backup
    gzip $BACKUP_FILE
    print_status "✅ Backup compressed: ${BACKUP_FILE}.gz"
    
    # Get file size
    BACKUP_SIZE=$(du -h "${BACKUP_FILE}.gz" | cut -f1)
    print_status "Backup size: $BACKUP_SIZE"
    
    # Clean up old backups (keep last 7 days)
    print_status "Cleaning up old backups (keeping last 7 days)..."
    find $BACKUP_DIR -name "agromart_${ENVIRONMENT}_*.sql.gz" -mtime +7 -delete
    
    print_status "🎉 Backup process completed successfully!"
else
    print_error "❌ Backup failed!"
    rm -f $BACKUP_FILE
    exit 1
fi

# List recent backups
print_status "Recent backups for $ENVIRONMENT:"
ls -lah $BACKUP_DIR/agromart_${ENVIRONMENT}_*.sql.gz 2>/dev/null | tail -5 || print_warning "No previous backups found"