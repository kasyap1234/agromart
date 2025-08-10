#!/bin/bash

# Start PostgreSQL using Docker Compose
echo "Starting PostgreSQL database..."
docker compose -f docker-compose.db.yml up -d

# Wait for database to be ready
echo "Waiting for database to initialize..."
sleep 5

# Run database migrations through Go application
echo "Running database migrations..."
(cd apps/server && go run main.go --migrate-only)

# Build the backend
echo "Building backend..."
(cd apps/server && go build -o server)
echo "Backend built successfully. Run with: ./server"