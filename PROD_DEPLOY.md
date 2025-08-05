# Production Deployment (Single Host, Docker Compose, Caddy HTTPS)

This guide describes a minimal, pragmatic production setup on a single Linux host using:
- Caddy (reverse proxy with automatic HTTPS via ACME)
- Backend: Go Echo API (built via docker/backend.Dockerfile)
- Frontend: Next.js (built via docker/frontend.Dockerfile)
- Postgres (official image)
- Docker Compose

No Kubernetes, no extra scaffolding. Fill in real secrets and domain later; defaults use localhost placeholders.

Prerequisites
- Linux host with Docker 24+ and docker compose plugin
- A DNS A record pointing your domain to this host (optional if using localhost-only HTTP)
- Open firewall for ports 80 and 443 (for HTTPS) and 5432 blocked publicly

Directory Layout (relevant)
- docker/backend.Dockerfile (API build)
- docker/frontend.Dockerfile (Next.js build)
- docker-compose.yml (or create docker-compose.prod.yml)
- apps/server (Go backend)
- apps/client (Next.js frontend)

Environment
Create a .env file in the project root with strong secrets:
POSTGRES_USER=postgres
POSTGRES_PASSWORD=REPLACE_WITH_STRONG_PASSWORD
POSTGRES_DB=inventory

DB_HOST=db
DB_PORT=5432
DB_NAME=inventory

JWT_SECRET=REPLACE_WITH_LONG_RANDOM_SECRET
APP_PORT=8080
NODE_ENV=production

# Frontend points API to public reverse-proxied path
NEXT_PUBLIC_API_URL=https://your-domain.example/api

# Caddy site (for localhost, HTTPS will likely fail without a resolvable domain)
CADDY_DOMAIN=your-domain.example
EMAIL_FOR_TLS=admin@your-domain.example

Never commit real secrets to VCS. Store this .env securely.

Compose Services
A production compose should include:
- db: Postgres with volume
- backend: Go API container, depends on db
- frontend: Next.js static/server container
- caddy: Reverse proxy, terminates TLS, routes to frontend and backend

Example docker-compose.prod.yml
version: "3.9"

services:
  db:
    image: postgres:15
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - db_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U $$POSTGRES_USER -d $$POSTGRES_DB"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: .
      dockerfile: docker/backend.Dockerfile
      args:
        BUILD_TARGET: app     # use production entrypoint (apps/server/main.go)
    environment:
      DB_HOST: db
      DB_PORT: ${DB_PORT}
      DB_NAME: ${DB_NAME}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      JWT_SECRET: ${JWT_SECRET}
      APP_PORT: ${APP_PORT}
      NODE_ENV: production
    depends_on:
      db:
        condition: service_healthy
    expose:
      - "8080"
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:8080/health"]
      interval: 15s
      timeout: 5s
      retries: 5

  frontend:
    build:
      context: .
      dockerfile: docker/frontend.Dockerfile
    environment:
      NODE_ENV: production
      NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL}
    expose:
      - "3000"
    # Optional: add a healthcheck if your frontend exposes one

  caddy:
    image: caddy:2
    ports:
      - "80:80"
      - "443:443"
    environment:
      CADDY_DOMAIN: ${CADDY_DOMAIN}
      EMAIL_FOR_TLS: ${EMAIL_FOR_TLS}
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
    depends_on:
      - backend
      - frontend

volumes:
  db_data:
  caddy_data:
  caddy_config:

Caddyfile (HTTPS for frontend and /api to backend)
# If using a real domain:
{$CADDY_DOMAIN} {
    encode zstd gzip

    @api path /api* 
    handle @api {
        reverse_proxy backend:8080
    }

    handle {
        reverse_proxy frontend:3000
    }

    tls {$EMAIL_FOR_TLS}
}

# If testing on localhost only (no TLS issuance):
# :80 {
#   encode zstd gzip
#   @api path /api*
#   handle @api {
#     reverse_proxy backend:8080
#   }
#   handle {
#     reverse_proxy frontend:3000
#   }
# }

Build and Run
Using the prod compose file above:
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d

Check status:
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs --tail=200 backend
docker compose -f docker-compose.prod.yml logs --tail=200 caddy

Post-Deployment Verification
1) API health:
   curl -k https://your-domain.example/api/health
   or if using the localhost block:
   curl http://localhost/api/health

2) Frontend:
   Visit https://your-domain.example
   Ensure NEXT_PUBLIC_API_URL was set to https://your-domain.example/api before building.

3) Auth:
   Register an initial admin (only do this once and then restrict registrations in production if needed):
   curl -k -X POST https://your-domain.example/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@your-domain.example","password":"REPLACE_STRONG_PASS","name":"Admin","tenant":"Default"}'

   Then login:
   curl -k -X POST https://your-domain.example/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@your-domain.example","password":"REPLACE_STRONG_PASS"}'

   Use the token with:
   curl -k -H "Authorization: Bearer <TOKEN>" https://your-domain.example/api/auth/me

Security and Hardening
- Set strong JWT_SECRET and DB password in .env. Rotate secrets periodically.
- Ensure registrations are controlled in production (disable public signup if not required).
- Restrict CORS to your origin in production (the dev entrypoint is permissive; production should be strict). If using apps/server/main.go, configure CORS accordingly or at the reverse proxy.
- Keep Postgres port 5432 closed to the internet (only internal Docker network access).
- Schedule automated backups for Postgres (pg_dump or volume snapshots).
- Enable HTTPS with a valid domain (Caddy handles ACME automatically). For localhost-only, use the HTTP block in Caddyfile.
- Monitor container logs and healthchecks; consider exporting metrics/logs to a central system.

Upgrades and Zero-Downtime Notes
- Rebuild and restart services:
  docker compose -f docker-compose.prod.yml pull
  docker compose -f docker-compose.prod.yml build
  docker compose -f docker-compose.prod.yml up -d

- Because this is a single-instance compose, short interruptions may occur during container recreation. If you require zero-downtime, consider two-host blue/green or a proper orchestrator.

Operational Tips
- No SEED_DEV in production; do not import demo data.
- Avoid exposing db outside of Docker network.
- Keep Caddy volumes (caddy_data, caddy_config) persisted for certificate storage.
- If you change domains, allow time for DNS to propagate before initial HTTPS issuance.

Rollback
- Keep a known-good image tag (e.g., use image: agromart-backend:YYYYMMDD and agromart-frontend:YYYYMMDD).
- To rollback:
  docker compose -f docker-compose.prod.yml down
  Edit compose to point to previous tags
  docker compose -f docker-compose.prod.yml up -d

Troubleshooting
- Caddy fails to issue certificates:
  - Confirm domain resolves to your host and 80/443 are open
  - Check logs: docker compose -f docker-compose.prod.yml logs -f caddy
  - Temporarily use the HTTP-only block on :80 for validation

- 401 responses on protected endpoints:
  - Verify JWT_SECRET consistent between app instances (single instance here)
  - Confirm Authorization header reach backend (Caddy reverse_proxy forwards headers)

- Frontend calling wrong API URL:
  - Ensure NEXT_PUBLIC_API_URL was set correctly before building frontend

- DB migrations:
  - The backend image includes migrate tool; the production entrypoint should run your migrations prior to starting (check your Dockerfile/entrypoint). If not, run migrations as a one-off job or on container start.

Reference Implementation Notes
- Backend prod entrypoint: apps/server/main.go
- Backend auth middleware: internal/auth/middleware.go
- Caddyfile above assumes backend serves /api/* and frontend all other routes
- Health endpoints: /health and /api/health

Appendix: Minimal localhost-only Caddy (no TLS)
Use this only for non-HTTPS local testing on a production-like host.
Create Caddyfile as:
:80 {
  encode zstd gzip
  @api path /api*
  handle @api { reverse_proxy backend:8080 }
  handle { reverse_proxy frontend:3000 }
}

Set NEXT_PUBLIC_API_URL=http://localhost/api and build frontend accordingly.