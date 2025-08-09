#!/bin/bash

# Dev build script for AgroMart project
set -e

# Start database
echo "Starting database..."
docker-compose -f ../docker-compose.db.yml up -d

# Wait for database to be ready
echo "Waiting for database to be ready..."
sleep 3

# Run migrations
echo "Running database migrations..."
cd ../apps/server
go run ./cmd/api/main.go --migrate-only
cd ../..

# Build backend
echo "Building backend..."
cd apps/server
go build -o agromart-backend ./cmd/api/main.go
cd ../..

# Build frontend
echo "Building frontend..."
cd apps/client
npm install
npm run build
cd ../..

echo "Dev build completed successfully!"
echo "To start backend: ./apps/server/agromart-backend"
echo "To start frontend: cd apps/client && npm start"
