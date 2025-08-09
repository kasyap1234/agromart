#!/usr/bin/env bash

# Dev build script for AgroMart project (robust paths)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="${SCRIPT_DIR}/.."

# Start database
echo "Starting database..."
docker compose -f "${REPO_ROOT}/docker-compose.db.yml" up -d

# Wait for database to be ready
echo "Waiting for database to be ready..."
sleep 3

# Run migrations
echo "Running database migrations..."
(
  cd "${REPO_ROOT}/apps/server"
  go run ./cmd/api/main.go --migrate-only
)

# Build backend
echo "Building backend..."
(
  cd "${REPO_ROOT}/apps/server"
  go build -o agromart-backend ./cmd/api/main.go
)

# Build frontend
echo "Building frontend..."
(
  cd "${REPO_ROOT}/apps/client"
  npm install
  npm run build
)

echo "Dev build completed successfully!"
echo "Starting backend (8080) and frontend in background..."

# Start backend with local DB settings (override docker-only defaults)
(
  cd "${REPO_ROOT}/apps/server"
  APP_ENV=development \
  APP_DB_HOST=localhost \
  APP_DB_PORT=5432 \
  APP_DB_USER=postgres \
  APP_DB_PASSWORD=secret \
  APP_DB_NAME=agromart \
  ./agromart-backend &
)

# Pick an available frontend port starting at FRONTEND_PORT or 3000
FRONTEND_PORT="${FRONTEND_PORT:-3000}"
pick_port() {
  local p=$1
  for i in $(seq 0 10); do
    local try=$((p+i))
    if ! lsof -i ":${try}" -sTCP:LISTEN >/dev/null 2>&1; then
      echo "$try"
      return 0
    fi
  done
  return 1
}
FOUND_PORT=$(pick_port "$FRONTEND_PORT") || {
  echo "No free port found in range ${FRONTEND_PORT}-${FRONTEND_PORT}+10"
  exit 1
}
FRONTEND_PORT="$FOUND_PORT"

(
  cd "${REPO_ROOT}/apps/client"
  PORT=${FRONTEND_PORT} npm start &
)
echo "Services starting. Backend on :8080, Frontend on :${FRONTEND_PORT}"
