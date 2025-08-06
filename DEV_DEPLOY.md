# Development Deployment (Local)

This repo contains:
- Backend: Go API at apps/server
- Frontend: Next.js app at apps/client
- Database: Postgres
- Docker: docker/backend.Dockerfile and apps/client/Dockerfile
- Compose files: docker-compose.dev.yml (dev stack with reverse proxy)

This guide explains how to run the full dev stack locally using Docker Compose, including Caddy as a reverse proxy that fronts both the Next.js client and the Go backend.

Prerequisites
- Docker 24+ and docker compose plugin
- Ports available: 8081 (Caddy), 8080 (backend), 3000 (client)
- bash, curl (for quick verification)

Services and Ports
- caddy: reverse proxy on http://localhost:8081
  - Proxies /api* to backend:8080
  - Proxies everything else to client:3000
- backend: Go server on http://localhost:8080
- client: Next.js app on http://localhost:3000
- db: Postgres 17 (internal only by default; not bound to host)

Environment Variables
The dev compose file wires defaults. If you need to override, set them in the compose or export them before running compose.

Backend (see docker-compose.dev.yml):
- APP_DB_HOST=db
- APP_DB_PORT=5432
- APP_DB_USER=postgres
- APP_DB_PASSWORD=secret
- APP_DB_NAME=inventory
- APP_APPPORT=8080
- JWT_SECRET=your-secret-key-change-in-production
- DATABASE_URL=postgres://postgres:secret@db:5432/inventory?sslmode=disable

Client:
- NEXT_PUBLIC_API_URL=http://caddy
  - The client talks to the backend through the Caddy service name on the Docker network.
  - When accessing via your browser, use Caddy at http://localhost:8081 so API calls resolve inside the network.

Database:
- POSTGRES_USER=postgres
- POSTGRES_PASSWORD=secret
- POSTGRES_DB=inventory
- Data volume: named volume pgdata

Start the Dev Stack
1) Bring everything up (builds images on first run):
   docker compose -f docker-compose.dev.yml up -d --build

2) Check status:
   docker compose -f docker-compose.dev.yml ps

3) Tail logs (useful on first boot):
   docker compose -f docker-compose.dev.yml logs -f

Reverse Proxy Details
Caddy configuration ([Caddyfile](Caddyfile:1)):
- /api* -> backend:8080
- all other paths -> client:3000
- Caddy listens on container :80 and is published on host 8081

Verify
- UI via Caddy:
  - http://localhost:8081/
  - http://localhost:8081/dashboard
- API via Caddy:
  - http://localhost:8081/api/health
- Direct targets (optional):
  - http://localhost:3000/
  - http://localhost:8080/health

Database Notes
- The db uses a named volume (pgdata). If you previously ran a different Postgres major version on the same volume, you may see an incompatibility error.
- To reset the dev database volume cleanly:
  docker compose -f docker-compose.dev.yml down
  docker volume rm agromart2_pgdata
  docker compose -f docker-compose.dev.yml up -d --build
- By default the db is not exposed on host 5432 to avoid conflicts. If you need host access for tools like psql or DBeaver, uncomment the ports section in [docker-compose.dev.yml](docker-compose.dev.yml:10).

Common Issues
- 502 from Caddy:
  - Ensure Caddyfile proxies to client:3000 (service name “client”) and backend:8080.
  - Ensure client is listening on 0.0.0.0:3000 (the provided client Dockerfile/Next.js defaults to binding all interfaces).
- DB unhealthy or FATAL version mismatch:
  - Reset the pgdata volume as shown above when changing major Postgres versions.
- Backend migrations:
  - The backend container runs migrations on startup using:
    migrate -path /app/sql/schema -database $DATABASE_URL up
  - Schema directory is mounted from [apps/server/sql/schema](apps/server/sql/schema:1).

Useful Commands
- Rebuild all and start:
  docker compose -f docker-compose.dev.yml up -d --build --remove-orphans
- Tail a specific service:
  docker compose -f docker-compose.dev.yml logs -f backend
- Restart only Caddy after editing Caddyfile:
  docker compose -f docker-compose.dev.yml up -d caddy
- Stop and remove containers and network:
  docker compose -f docker-compose.dev.yml down

Project Paths Reference
- Backend main: [apps/server/main.go](apps/server/main.go:1)
- SQL schema: [apps/server/sql/schema](apps/server/sql/schema:1)
- SQL queries: [apps/server/sql/queries](apps/server/sql/queries:1)
- Frontend config: [apps/client/next.config.js](apps/client/next.config.js:1)
- Backend auth middleware: [internal/auth/middleware.go](internal/auth/middleware.go:1)

Notes
- For local development, access everything through Caddy at http://localhost:8081 so the client’s API calls to http://caddy resolve correctly inside Docker.
- Only expose Postgres to host if required; otherwise keep it internal to avoid conflicts with a local Postgres installation.