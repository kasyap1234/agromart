#!/bin/bash

# Stop backend server if running
if [ -f "apps/server/server" ]; then
    echo "Stopping backend server..."
    pkill -f "apps/server/server" || true
fi

# Stop PostgreSQL container
echo "Stopping PostgreSQL database..."
docker compose -f docker-compose.db.yml down

echo "Development environment stopped."