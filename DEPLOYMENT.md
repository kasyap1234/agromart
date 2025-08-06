# Deployment

This document summarizes only the relevant steps for deploying and running the current codebase using the existing configuration.

Stack Overview
- Reverse proxy: Caddy (container port 80, published on host 8081)
- Frontend: Next.js (service: client, port 3000)
- Backend: Go (service: backend, port 8080)
- Database: Postgres 17 (service: db, internal by default via named volume pgdata)

Key Files
- Compose (dev): [docker-compose.dev.yml](docker-compose.dev.yml:1)
- Reverse proxy: [Caddyfile](Caddyfile:1)
- Backend main: [apps/server/main.go](apps/server/main.go:1)
- SQL schema: [apps/server/sql/schema](apps/server/sql/schema:1)
- Frontend config: [apps/client/next.config.js](apps/client/next.config.js:1)
- Frontend Dockerfile: [apps/client/Dockerfile](apps/client/Dockerfile:1)
- Backend Dockerfile: [docker/backend.Dockerfile](docker/backend.Dockerfile:1)

Dev Deployment (via Compose)
- Build and start all:
  docker compose -f docker-compose.dev.yml up -d --build --remove-orphans
- Check status:
  docker compose -f docker-compose.dev.yml ps
- Tail logs:
  docker compose -f docker-compose.dev.yml logs -f

Routing (Caddy)
Caddy proxies based on [Caddyfile](Caddyfile:1):
- /api* -> backend:8080
- all other paths -> client:3000
Access the app via http://localhost:8081

Environment Wiring (from compose)
Backend:
- DATABASE_URL=postgres://postgres:secret@db:5432/inventory?sslmode=disable
- JWT_SECRET=your-secret-key-change-in-production
Client:
- NEXT_PUBLIC_API_URL=http://caddy
Database:
- POSTGRES_USER=postgres, POSTGRES_PASSWORD=secret, POSTGRES_DB=inventory
- Named volume: pgdata (internal by default; host port 5432 not published)

Database Version/Volume Note
If Postgres reports an incompatible data directory (e.g., previous v15 data while using v17):
- Reset the dev volume:
  docker compose -f docker-compose.dev.yml down
  docker volume rm agromart2_pgdata
  docker compose -f docker-compose.dev.yml up -d --build

Direct Endpoints (useful for checks)
- UI via Caddy: http://localhost:8081/
- Backend health: http://localhost:8080/health
- API via Caddy: http://localhost:8081/api/health

That’s all that’s needed to deploy and run this repository with the current configuration.