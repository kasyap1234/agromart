#!/bin/bash

# AgroMart Development Environment Stop Script
# Gracefully stops the development environment

set -e

COMPOSE_FILE="docker-compose.dev.yml"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

show_help() {
    cat << EOF
AgroMart Development Environment Stop Script

USAGE:
    $0 [OPTIONS]

OPTIONS:
    --volumes, -v    Remove volumes (WARNING: Deletes all data)
    --help, -h       Show this help message

EXAMPLES:
    $0              # Stop services, keep data
    $0 --volumes    # Stop services and remove all data
EOF
}

main() {
    local remove_volumes=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --volumes|-v)
                remove_volumes=true
                shift
                ;;
            --help|-h)
                show_help
                exit 0
                ;;
            *)
                echo "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    echo "🛑 Stopping AgroMart Development Environment"
    echo "==========================================="
    
    if [[ "$remove_volumes" == "true" ]]; then
        log_warning "This will remove ALL development data (database, MinIO files)!"
        read -p "Type 'DELETE' to confirm: " -r
        echo
        if [[ "$REPLY" == "DELETE" ]]; then
            log_info "Stopping services and removing volumes..."
            docker compose -f "$COMPOSE_FILE" down --volumes --remove-orphans --timeout 30
            log_warning "All development data has been removed"
        else
            log_info "Operation cancelled"
            exit 0
        fi
    else
        log_info "Stopping services (keeping data)..."
        docker compose -f "$COMPOSE_FILE" down --remove-orphans --timeout 30
    fi
    
    log_success "AgroMart Development Environment stopped"
}

main "$@"