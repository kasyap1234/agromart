#!/usr/bin/env bash
set -euo pipefail

# Production deploy script:
# - Builds multi-stage backend (static Go) and frontend (Next.js) images
# - Uses Caddy as reverse proxy to serve frontend and proxy /api to backend
# - Optionally pushes images to a registry
# - Brings up the stack with docker-compose.prod.yml using .env.production

# Prereqs:
# - Docker and docker compose installed
# - .env.production configured with DB_*, JWT_SECRET, and optional PUBLIC_* ports
# - DOCKERHUB_USERNAME/DOCKERHUB_REPO set if pushing to Docker Hub (optional)

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$ROOT_DIR"

if [ ! -f .env.production ]; then
  echo "[deploy] Missing .env.production. Create it based on .env.example/.env and set production values."
  exit 1
fi

# Load production env
set -o allexport; source .env.production; set +o allexport

# Defaults
IMAGE_TAG="${IMAGE_TAG:-$(date -u +%Y%m%d%H%M)}"
DOCKERHUB_USERNAME="${DOCKERHUB_USERNAME:-}"
DOCKERHUB_REPO="${DOCKERHUB_REPO:-agromart}"
REGISTRY_PREFIX=""
if [ -n "${DOCKERHUB_USERNAME}" ]; then
  REGISTRY_PREFIX="${DOCKERHUB_USERNAME}/${DOCKERHUB_REPO}"
fi

# Images (allow override)
BACKEND_IMAGE="${DOCKER_IMAGE_BACKEND:-${REGISTRY_PREFIX:+$REGISTRY_PREFIX-}agromart-backend}:${IMAGE_TAG}"
FRONTEND_IMAGE="${DOCKER_IMAGE_FRONTEND:-${REGISTRY_PREFIX:+$REGISTRY_PREFIX-}agromart-frontend}:${IMAGE_TAG}"

echo "[deploy] Using images:"
echo "  BACKEND_IMAGE=${BACKEND_IMAGE}"
echo "  FRONTEND_IMAGE=${FRONTEND_IMAGE}"
echo "  IMAGE_TAG=${IMAGE_TAG}"

# Build backend (uses top-level Dockerfile multi-stage; runtime target produces static binary + migrations)
echo "[deploy] Building backend image..."
docker build \
  --target runtime \
  -t "${BACKEND_IMAGE}" \
  -f Dockerfile \
  .

# Build frontend image (Next.js). Caddy will reverse-proxy to this container.
echo "[deploy] Building frontend image..."
docker build \
  --build-arg PUBLIC_API_URL="${PUBLIC_API_URL:-/api}" \
  -t "${FRONTEND_IMAGE}" \
  -f docker/frontend.Dockerfile \
  .

# Optional: push to registry
if [ "${PUSH_IMAGES:-false}" = "true" ]; then
  echo "[deploy] Pushing images..."
  docker push "${BACKEND_IMAGE}"
  docker push "${FRONTEND_IMAGE}"
fi

# Bring up production stack
echo "[deploy] Starting production stack with docker-compose.prod.yml"
# Export images and tag for compose file
export DOCKER_IMAGE_BACKEND="${BACKEND_IMAGE%:*}"
export DOCKER_IMAGE_FRONTEND="${FRONTEND_IMAGE%:*}"
export IMAGE_TAG="${IMAGE_TAG}"

docker compose -f docker-compose.prod.yml --env-file .env.production pull || true
docker compose -f docker-compose.prod.yml --env-file .env.production up -d db

# Wait for DB health
echo "[deploy] Waiting for db to be healthy..."
for i in $(seq 1 60); do
  status=$(docker inspect --format='{{.State.Health.Status}}' agromart-db 2>/dev/null || true)
  echo "  db: ${status:-unknown}"
  [ "${status:-starting}" = "healthy" ] && break || true
  sleep 2
done
[ "${status:-}" = "healthy" ] || { echo "[deploy] db not healthy"; docker compose -f docker-compose.prod.yml logs db --tail=200 || true; exit 1; }

# Start backend, frontend (if defined in compose), and caddy
docker compose -f docker-compose.prod.yml --env-file .env.production up -d backend caddy

# Health checks
BACKEND_PORT="${APP_APPPORT:-8080}"
echo "[deploy] Probing backend: http://localhost:${BACKEND_PORT}/health"
for i in $(seq 1 60); do
  code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${BACKEND_PORT}/health" || true)
  [ "$code" = "200" ] && break || true
  sleep 2
done
[ "${code:-000}" = "200" ] || { echo "[deploy] backend not healthy"; docker compose -f docker-compose.prod.yml logs backend --tail=200 || true; exit 1; }

PUB_HTTP="${PUBLIC_HTTP_PORT:-80}"
echo "[deploy] Probing caddy: http://localhost:${PUB_HTTP}"
for i in $(seq 1 60); do
  ncode=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${PUB_HTTP}" || true)
  [ "$ncode" = "200" ] && break || true
  sleep 2
done
[ "${ncode:-000}" = "200" ] || { echo "[deploy] caddy not serving 200"; docker compose -f docker-compose.prod.yml logs caddy --tail=200 || true; exit 1; }

echo "[deploy] Production URLs:"
echo " - Caddy:    http://localhost:${PUB_HTTP}"
echo " - Backend:  http://localhost:${BACKEND_PORT} (direct)"
echo " - Frontend: http://localhost:${PUB_HTTP}"
echo " - API via Caddy: http://localhost:${PUB_HTTP}/api"