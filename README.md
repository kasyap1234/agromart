# AgroMart - Agricultural Management System

A modern, scalable agricultural inventory management system built with Go, Next.js, PostgreSQL, and Docker. This system provides comprehensive tools for managing products, inventory, suppliers, customers, purchase orders, and sales with real-time analytics and reporting.

## Quick Start

### Local Development
```bash
# Clone repository
git clone <repository-url>
cd agromart

# Install Bun (if not already installed)
curl -fsSL https://bun.sh/install | bash

# Start development environment
docker compose -f docker-compose.dev.yml up --build

# Access the application
# Frontend: http://localhost:9001
# Backend API: http://localhost:8080/api
# Default login: admin@example.com / password
```

### Production Deployment
For comprehensive production deployment instructions including database migration verification, environment configuration, and security hardening, see [startapp.md](startapp.md).

### Migration Verification
Before any deployment, verify database migrations:
```bash
cd apps/server/tools/migration-verifier
go run main.go
```

## Prerequisites

- **Docker & Docker Compose** - For containerized development and deployment
- **Git** - For version control
- **Code Editor** (optional) - VS Code recommended with Go and TypeScript extensions

## Environment Setup

### 1. Install Docker Desktop
Download and install Docker Desktop from [docker.com](https://www.docker.com/products/docker-desktop), then start the application.

### 2. Clone the Repository
```bash
git clone <your-repository-url>
cd agromart
```

## Project Structure

- `apps/server/` - Go backend with Echo framework
- `apps/client/` - Next.js frontend application
- `apps/server/sql/schema/` - Database migrations (14 total)
- `apps/server/tools/migration-verifier/` - Migration verification tool
- `docker-compose.dev.yml` - Local development environment
- `docker-compose.prod.yml` - Production deployment configuration

## Configuration

Environment files are automatically configured:
- `.env` - Development settings (automatically created)
- `.env.production` - Production settings (copy and customize from `.env.example`)

Key configuration areas:
- **Database**: PostgreSQL connection settings
- **Security**: JWT secrets and API keys
- **Performance**: Connection pool settings
- **Domains**: For production SSL/TLS setup

## Features

- **Multi-tenant Architecture** - Secure tenant isolation
- **Real-time Inventory Tracking** - Batch support with expiry management
- **Role-based Access Control** - Admin, manager, and user roles
- **Comprehensive Analytics** - Dashboard with key metrics
- **File Upload System** - MinIO integration for document management
- **Audit Logging** - Complete inventory and user action tracking
- **Mobile Responsive** - Works on desktop, tablet, and mobile devices

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS, Bun (package manager)
- **Backend**: Go 1.24.5, Echo framework, JWT authentication
- **Database**: PostgreSQL 17.5 with sqlc for type-safe queries
- **Infrastructure**: Docker, Docker Compose
- **Testing**: Jest (unit), Playwright (E2E), Go testing
- **Code Quality**: ESLint, Prettier, Husky

## Database

- **14 migrations** covering complete schema (tenants, users, products, inventory, etc.)
- **Automatic migration verification** before deployments
- **Migration verification tool** at `apps/server/tools/migration-verifier/`

## Documentation

- **[Complete Setup Guide](startapp.md)** - Comprehensive development and production deployment
- **Migration Verification Tool** - Database consistency checking
- **Environment Configuration** - Development and production settings

## Support

For issues and questions:
1. Check the [comprehensive setup guide](startapp.md)
2. Run migration verification before deployments
3. Review logs: `docker compose -f docker-compose.dev.yml logs`
4. Test health endpoints: `curl http://localhost:8080/health`
