# AgroMart Monorepo - Quick Start

Run both backend (Go + Echo + Postgres) and frontend (Next.js) locally.

Prerequisites
- Docker and Docker Compose
- [mise-en-place](https://mise.jdx.dev/) version manager
- curl (optional, for quick checks)

Install mise:
```bash
curl https://mise.jdx.dev/install.sh | sh
```

Ports
- Backend API: 8080
- Frontend: 3000 by default (Next.js auto-increments if taken)

Backend: API + DB
1) Start Postgres and API
   docker compose -f docker-compose.dev.yml up -d db backend

2) Tail backend logs (optional)
   docker compose -f docker-compose.dev.yml logs -f backend --tail=200

3) Verify health
   curl -sf http://localhost:8080/health && echo
   Expected:
   {"status":"ok","service":"agromart-api"}

4) Smoke test auth flow (optional)
   bash apps/server/test.sh

Frontend: Next.js
1) Start dev server
   cd apps/client
   npm install
   npm run dev
   Visit the printed URL (usually http://localhost:3000)

Configuration notes
- Backend config defaults live in apps/server/config/config.go; .env is read if present at repo root, ./apps/server, or /app.
- Frontend fetches API from http://localhost:8080/api (see apps/client/src/lib/api.ts(api.ts:1)).

Troubleshooting
- If Next.js reports the port is in use, it will pick the next port automatically.
- A 404 on first load is expected for unauthenticated requests; use /auth/login.
- Rebuild backend cleanly if needed:
   docker compose -f docker-compose.dev.yml build --no-cache backend && \
   docker compose -f docker-compose.dev.yml up -d backend

A modern, scalable agricultural management system built with Go, PostgreSQL, and sqlc.

## Architecture

This application follows modern Go best practices using:

- **Database**: PostgreSQL with pgx/v5 driver
- **Code Generation**: sqlc for type-safe SQL queries
- **Web Framework**: Echo v4
- **Logging**: Zerolog
- **Configuration**: Viper
- **Migrations**: golang-migrate (optional)
- **Containerization**: Docker & Docker Compose

## Features

- **Multi-tenant Architecture**: Secure tenant isolation
- **Product Management**: Complete product lifecycle management
- **Inventory Control**: Real-time inventory tracking with batch support
- **Order Management**: Purchase and sales order processing
- **Supplier & Customer Management**: Complete vendor and customer lifecycle
- **Location Management**: Multi-location warehouse support
- **Audit Logging**: Complete inventory audit trail

## Stopping the Development Environment

To stop the backend server and database when you're done working:

```bash
./stop-dev.sh
```

This will:
- Stop the backend server
- Shut down the PostgreSQL container
