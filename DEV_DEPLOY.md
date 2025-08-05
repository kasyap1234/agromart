# Development Deployment (Local)

This repo contains:
- Backend: Go Echo API at apps/server (dev entrypoint at apps/server/cmd/api/main.go)
- Frontend: Next.js app at apps/client
- Database: Postgres
- Docker: docker/backend.Dockerfile and docker/frontend.Dockerfile
- Compose files: docker-compose.yml (primary), docker-compose.dev.yml (optional if present)

This guide gets you running locally with docker compose, JWT auth, and optional dev data seeding.

Prerequisites
- Docker 24+ and docker compose plugin
- Ports available: 3000 (frontend), 8080 (backend), 5432 (db)
- bash, curl (for quick verification)

Environment Variables
Create a .env file at project root if you want to override defaults. Typical variables:
- POSTGRES_USER=postgres
- POSTGRES_PASSWORD=secret
- POSTGRES_DB=inventory
- DB_HOST=db
- DB_PORT=5432
- DB_NAME=inventory
- JWT_SECRET=change_me_for_dev
- APP_PORT=8080
- NEXT_PUBLIC_API_URL=http://localhost:8080/api
- NODE_ENV=development
- SEED_DEV=true (optional; see note below)

Important: The dev entrypoint supports optional seeding via SEED_DEV=true inside the backend container. If seeding fails due to schema changes (e.g., products.price NOT NULL), use manual registration and skip seeding.

Start Services
1) Build and start backend and db (and frontend if included in compose)
- docker compose build backend
- docker compose up -d db
- docker compose up -d backend
- Optional: docker compose up -d frontend

2) Check container status
- docker compose ps

3) Tail backend logs (useful during first boot)
- docker compose logs -f backend

Health Checks
- Backend health:
  - curl http://localhost:8080/health
  - curl http://localhost:8080/api/health

- If you enabled the dev entrypoint with Swagger:
  - Open http://localhost:8080/swagger/index.html (if enabled by the entrypoint)

Authentication for Dev
Dev flow works without seeding:
1) Register a user
  curl -sS -X POST http://localhost:8080/api/auth/register \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@test.local","password":"S3cure!Pass","name":"Admin User","tenant":"Acme Inc"}'

Expected JSON includes data.token and data.refresh_token.

2) Login (if needed)
  curl -sS -X POST http://localhost:8080/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@test.local","password":"S3cure!Pass"}'

Extract token from top-level token or data.token and call protected routes with:
  curl -H "Authorization: Bearer <TOKEN>" http://localhost:8080/api/auth/me

Frontend
If running the Next.js frontend:
- Ensure NEXT_PUBLIC_API_URL points to http://localhost:8080/api
- Access UI at http://localhost:3000
- Login via the UI with your registered user

Common Issues
- 401 on /api/auth/login: Ensure the backend is running the dev entrypoint (cmd/api) and public path bypass is active. Manual registration works even if seeding fails.
- Seeding error (e.g., products.price NOT NULL): This only affects optional demo data. Register/login manually and create records via UI or API.
- CORS: The dev entrypoint configures permissive CORS suitable for local development.
- Database connection: Verify db container is healthy and backend logs show DB ping OK.

Useful Commands
- Rebuild backend with dev entrypoint:
  docker compose build --no-cache backend && docker compose up -d backend
- Show last backend logs:
  docker compose logs --tail=200 backend
- Stop all:
  docker compose down

Project Paths Reference
- Backend production entrypoint: apps/server/main.go
- Backend dev entrypoint: apps/server/cmd/api/main.go
- Backend auth middleware: internal/auth/middleware.go
- SQL schema: apps/server/sql/schema
- SQL queries: apps/server/sql/queries
- Frontend config: apps/client/next.config.js

Notes
- Keep SEED_DEV for dev only. For production, never seed demo data.
- If the frontend has its own healthcheck path configured, it may not reflect real readiness; rely on backend /health and /api/health for API readiness.