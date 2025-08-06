docker-compose.dev.yml: Simple dev stack with db, backend, client, and caddy. Backend runs migrations at startup via migrate CLI and bind-mounts migrations from apps/server/sql/schema.
docker-compose.yml: More “generic/prod-like” stack. Backend image embeds the migrate binary and migrations and runs migrate up in its command before starting. Exposes ports on host. Adds env files and health checks.
docker/backend.Dockerfile: Builds the Go binary, installs golang-migrate, and copies migrations into the final image at /root/sql/schema. Suitable for standalone “one image contains binary + migrations” pattern.
docker/migrate.Dockerfile: Provides a dedicated migrate image (unused currently by compose files).
Objective
You want a simple, reliable demo deployment that’s not high-scale, without building a full production orchestration.

Recommended option: Use docker-compose.yml as your demo “production” runner
Why

The backend image already embeds both the binary and migrations (no bind mounts required for migrations).
The compose command runs migrations before starting the API, which is acceptable for a demo.
Health checks are defined; environment variables are centralized via .env.
Simpler than the dev file and avoids HMR/dev noise.
How to run

Prepare .env at repo root with DB_* and APP_* variables (you already have patterns in docker-compose.yml).
Build and run: docker compose -f docker-compose.yml up --build
Access:
Backend: http://localhost:8080
If you keep the frontend service here, http://localhost:3000
If you prefer to put Caddy in front for a single entry, add it to docker-compose.yml mirroring your dev Caddyfile.
If you prefer to keep Caddy as the entrypoint in demo

Add caddy service to docker-compose.yml similar to dev: caddy: image: caddy:2 ports: - "8081:80" volumes: - ./Caddyfile:/etc/caddy/Caddyfile:ro depends_on: backend: condition: service_healthy frontend: condition: service_started
Then use http://localhost:8081 as your single endpoint. This matches your previous validation flow and asset proxying.
Security and polish for demo mode

Set APP_ENV=production, GO_ENV=production to disable dev-only instrumentation in app (your code gates metrics/pprof by APP_ENV).
Consider leaving Prometheus/pprof disabled for public demos; if needed privately, keep Caddy blocks or firewall.
Ensure JWT_SECRET is non-default in .env.
Consider Postgres port not exposed on host (remove "5432:5432") if you don’t need direct access.
When to use docker-compose.dev.yml

Local development and iteration (hot reloads on frontend, bind-mounted migrations). Not recommended for demo “prod” if you want a cleaner, immutable image-based setup.
Alternative: Introduce a one-shot migrate service (optional hardening)

Since you already have docker/migrate.Dockerfile, you can split migrations into a dedicated service in docker-compose.yml and remove migrate from the backend’s command:
migrate:
build:
context: .
dockerfile: docker/migrate.Dockerfile
depends_on:
db:
condition: service_healthy
environment:
DATABASE_URL: postgres://
D
B
U
S
E
R
:
DB 
U
​
 SER:DB_PASSWORD@db:
D
B
P
O
R
T
/
DB 
P
​
 ORT/DB_NAME?sslmode=disable
volumes:
- ./apps/server/sql/schema:/migrations:ro
command: ["-path", "/migrations", "-database", "$$DATABASE_URL", "up"]
restart: "no"

backend:
command: ["./main"]  # no migrate step here
depends_on:
db:
condition: service_healthy
migrate:
condition: service_completed_successfully

This is more “prod-like” while still simple. For a demo, either approach works. If you want the least moving parts, keep the current backend-runner migration in docker-compose.yml.

Final guidance

For demo: run docker-compose.yml. It builds a self-contained backend image with migrations and starts everything with health checks. If you want a single public port, add caddy as above and use http://localhost:8081.
For real production later: move to a separate migration job/service (or CI step), add CREATE INDEX CONCURRENTLY in heavy migrations, and use dedicated roles and secrets management. Not necessary for your current demo scope.