#!/usr/bin/env bash
set -euo pipefail

# Load env
if [ -f .env ]; then
  echo "[start] Loading .env"
  set -o allexport; source .env; set +o allexport
fi

# Preflight
command -v docker >/dev/null || { echo "docker not found"; exit 1; }
docker compose version >/dev/null || { echo "docker compose not found"; exit 1; }

# Build
echo "[start] Building images"
docker compose build

# DB up and wait
echo "[start] Up db"
docker compose up -d db
for i in $(seq 1 60); do
  status=$(docker inspect --format={{json .State.Health.Status}} agromart-db 2>/dev/null || true)
  echo "[start] db health status: $status"
  echo "$status" | grep -q healthy && break || true
  sleep 2
done

# Backend up and wait
PORT=${APP_PORT:-8080}
echo "[start] Up backend"
docker compose up -d backend
for i in $(seq 1 60); do
  code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:${PORT}/health || true)
  [ "$code" = "200" ] && break || true
  sleep 2
done
[ "${code:-000}" = "200" ] || { echo "[start] backend not healthy"; docker compose logs backend --tail=200; exit 1; }

# Frontend up and quick probe
echo "[start] Up frontend"
docker compose up -d frontend || true
for i in $(seq 1 30); do
  c=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 || true)
  [ "$c" = "200" ] && break || true
  sleep 2
done

echo "[start] URLs:\n - Backend:  http://localhost:${PORT}\n - Health:   http://localhost:${PORT}/health\n - Frontend: http://localhost:3000"
