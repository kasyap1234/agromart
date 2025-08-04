#!/usr/bin/env bash
set -euo pipefail

# Resolve repo root even when invoked from anywhere
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${REPO_ROOT}"

# Load env from repo root
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

# DB up and wait (use compose health)
echo "[start] Up db"
docker compose up -d db
for i in $(seq 1 60); do
  status=$(docker inspect --format='{{.State.Health.Status}}' agromart-db 2>/dev/null || true)
  echo "[start] db health status: ${status:-unknown}"
  [ "${status:-starting}" = "healthy" ] && break || true
  sleep 2
done
[ "${status:-}" = "healthy" ] || { echo "[start] db not healthy"; docker compose logs db --tail=200 || true; exit 1; }

# Backend up and wait
PORT=${APP_APPPORT:-8080}
echo "[start] Up backend"
docker compose up -d backend
for i in $(seq 1 60); do
  code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${PORT}/health" || true)
  [ "$code" = "200" ] && break || true
  sleep 2
done
[ "${code:-000}" = "200" ] || { echo "[start] backend not healthy"; docker compose logs backend --tail=200 || true; exit 1; }

# Frontend up and quick probe
echo "[start] Up frontend"
docker compose up -d frontend || true
for i in $(seq 1 30); do
  c=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000" || true)
  [ "$c" = "200" ] && break || true
  sleep 2
done

printf "%s\n" "[start] URLs:" " - Backend:  http://localhost:${PORT}" " - Health:   http://localhost:${PORT}/health" " - Frontend: http://localhost:3000"
