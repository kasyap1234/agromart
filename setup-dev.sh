#!/bin/bash

# Exit on error
set -e

# Install mise if not already installed
if ! command -v mise &> /dev/null; then
    echo "Installing mise..."
    curl -fsSL https://mise.jdx.dev/install.sh | sh
    echo 'eval "$(mise activate bash)"' >> ~/.bashrc
    echo 'eval "$(mise activate zsh)"' >> ~/.zshrc
    source ~/.bashrc
fi

# Set up development environment
echo "Setting up development environment..."
mise install 
mise activate

# Start database
echo "Starting PostgreSQL database..."
docker compose -f docker-compose.db.yml up -d

# Wait for database initialization
echo "Waiting for database to initialize..."
sleep 5

# Run backend setup
echo "Running backend setup..."
./run-backend.sh

echo "Development setup complete!"
echo "Start frontend with: cd apps/client && npm install && npm run dev"
echo "Access backend at: http://localhost:8080"
echo "Access Swagger at: http://localhost:8080/swagger"