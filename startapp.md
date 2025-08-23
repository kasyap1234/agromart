# AgroMart Setup & Deployment Guide

This comprehensive guide covers both local development and production deployment of the AgroMart agricultural management system.

## 🚀 Quick Start (Local Development)

### Prerequisites
- **Docker Desktop** - Container runtime
   - macOS: https://docs.docker.com/desktop/install/mac-install/
   - Windows: https://docs.docker.com/desktop/install/windows-install/
   - Linux: https://docs.docker.com/desktop/install/linux-install/
- **Bun** - Fast JavaScript runtime and package manager (automatically installed)
   - Install: `curl -fsSL https://bun.sh/install | bash`
- **Git** - Version control (if cloning repository)
- **Code Editor** (optional) - VS Code recommended

### Local Development Setup
1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd agromart
   ```

2. **Start development environment:**
   ```bash
   docker compose -f docker-compose.dev.yml up --build
   ```

3. **Access the application:**
   - **Frontend**: http://localhost:9000
   - **Backend API**: http://localhost:8080/api
   - **API Health**: http://localhost:8080/health

4. **Default login credentials:**
   - Email: admin@example.com
   - Password: password

### Project Structure
- `docker-compose.dev.yml` - Local development environment
- `apps/server/` - Go backend application
- `apps/client/` - Next.js frontend application
- `apps/server/sql/schema/` - Database migrations
- `apps/server/tools/migration-verifier/` - Migration verification tool

Quick start (recommended)
1) Open a terminal
   - macOS: Spotlight → “Terminal”
   - Windows: Command Prompt or PowerShell
   - Linux: Your preferred terminal

2) Go to the project folder
   Example:
   - macOS/Linux: cd /path/to/Agromart
   - Windows: cd C:\path\to\Agromart

3) Start everything
   Run this command:
   docker compose -f docker-compose.dev.yml up --build

   What this does:
   - Starts PostgreSQL database
   - Runs database setup (migrations)
   - Starts the backend API on port 8080
   - Starts the frontend website on port 9000

   First run can take a few minutes while Docker downloads images.

4) Open the app
   - Backend health: http://localhost:8080/health
     You should see a small JSON response saying the server is healthy.
   - Frontend website: http://localhost:9000
     You should see the login page.

5) Log in
   - Email: admin@example.com
   - Password: password

## 🛠️ Database Migration Verification

Before any deployment, verify your database migrations are in sync:

```bash
# Verify migrations against database
cd apps/server/tools/migration-verifier
go run main.go

# Expected output shows all 14 migrations as "applied"
# with no pending or missing migrations
```

## 🚢 Production Deployment

### Prerequisites for Production
- **Server Requirements:**
  - Linux server (Ubuntu 20.04+ recommended)
  - Minimum 2GB RAM, 2 CPU cores
  - 10GB free disk space
- **Domain Name** (optional but recommended)
- **SSL Certificate** (Let's Encrypt integration included)
- **Docker & Docker Compose** installed on server

### Step 1: Server Preparation
1. **Update system packages:**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

2. **Install Docker:**
   ```bash
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh
   sudo usermod -aG docker $USER
   ```

3. **Install Docker Compose:**
   ```bash
   sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
   sudo chmod +x /usr/local/bin/docker-compose
   ```

4. **Install Git:**
   ```bash
   sudo apt install git -y
   ```

### Step 2: Application Deployment
1. **Clone repository:**
   ```bash
   git clone <repository-url>
   cd agromart
   ```

2. **Configure production environment:**
   ```bash
   cp .env.example .env.production
   ```

3. **Edit production environment variables:**
   ```bash
   nano .env.production
   ```

   **Critical Security Settings:**
   ```bash
   # Generate secure JWT secret (64+ characters)
   openssl rand -base64 64

   # Set strong database password
   # Set domain name for SSL
   CADDY_DOMAIN=your-domain.com
   EMAIL_FOR_TLS=admin@your-domain.com
   ```

### Step 3: Database Migration Verification
1. **Verify migrations locally first:**
   ```bash
   # Run migration verification tool
   cd apps/server/tools/migration-verifier
   go run main.go
   ```

2. **Check migration status:**
   - All 14 migrations should show as "applied"
   - No pending or missing migrations
   - Review migration_verification_report.txt for details

### Step 4: Production Deployment
1. **Build and start production services:**
   ```bash
   # Build frontend assets
   docker compose -f docker-compose.prod.yml --profile build up frontend-build

   # Start production services
   docker compose -f docker-compose.prod.yml up -d
   ```

2. **Verify deployment:**
   ```bash
   # Check service status
   docker compose -f docker-compose.prod.yml ps

   # View logs
   docker compose -f docker-compose.prod.yml logs -f

   # Test health endpoints
   curl http://localhost/health
   curl http://localhost/api/health
   ```

3. **Access your application:**
   - **HTTP**: http://your-domain.com (redirects to HTTPS)
   - **HTTPS**: https://your-domain.com
   - **API**: https://your-domain.com/api

### Step 5: Post-Deployment Verification
1. **Verify database migrations in production:**
   ```bash
   # Run migration verification against production database
   cd apps/server/tools/migration-verifier
   DB_HOST=your-production-db-host \
   DB_PASSWORD=your-production-db-password \
   go run main.go
   ```

2. **Test core functionality:**
   - User registration and login
   - Product and inventory management
   - Purchase order processing
   - Report generation

## 🔧 Environment Configuration

### Production Environment Variables
```bash
# .env.production - Critical Security Settings

# Database (CHANGE THESE VALUES)
DB_USER=agromart_prod_user
DB_PASSWORD=SECURE_PRODUCTION_PASSWORD_32_CHARS_MIN
DB_NAME=agromart_production

# Security (MUST CHANGE)
APP_JWT_SECRET=64_CHARACTER_SECURE_RANDOM_STRING_HERE
APP_REDIS_PASSWORD=SECURE_REDIS_PASSWORD

# Domain & SSL
CADDY_DOMAIN=your-production-domain.com
EMAIL_FOR_TLS=admin@your-production-domain.com

# Performance Tuning
APP_MAX_CONNS=100
APP_MIN_CONNS=20
APP_MAX_CONN_LIFE_TIME=1h
APP_MAX_CONN_IDLE_TIME=30m
```

### Development Environment Variables
```bash
# .env - Development Settings (less secure, faster)
DB_USER=postgres
DB_PASSWORD=secret
DB_NAME=agromart

APP_JWT_SECRET=supersecretjwt-change-me-for-local-dev-if-you-want
APP_REDIS_PASSWORD=redis-password

# Performance (development optimized)
APP_MAX_CONNS=25
APP_MIN_CONNS=5
```

## 📊 Monitoring & Maintenance

### Health Checks
- **Application Health**: `https://your-domain.com/health`
- **API Health**: `https://your-domain.com/api/health`
- **Database Status**: Check Docker container logs

### Log Monitoring
```bash
# View all service logs
docker compose -f docker-compose.prod.yml logs -f

# View specific service logs
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f caddy
```

### Backup Strategy
1. **Database Backups:**
   ```bash
   # Create database dump
   docker compose -f docker-compose.prod.yml exec db pg_dump -U postgres agromart > backup_$(date +%Y%m%d_%H%M%S).sql

   # Restore from backup
   docker compose -f docker-compose.prod.yml exec -T db psql -U postgres agromart < backup_file.sql
   ```

2. **Volume Backups:**
   ```bash
   # Backup Docker volumes
   docker run --rm -v agromart_db_data:/data -v $(pwd):/backup alpine tar czf /backup/db_backup_$(date +%Y%m%d_%H%M%S).tar.gz /data
   ```

### Updates & Rollbacks
1. **Update Application:**
   ```bash
   # Pull latest changes
   git pull origin main

   # Run migration verification
   cd apps/server/tools/migration-verifier && go run main.go

   # Deploy updates
   docker compose -f docker-compose.prod.yml down
   docker compose -f docker-compose.prod.yml --profile build up frontend-build
   docker compose -f docker-compose.prod.yml up -d
   ```

2. **Rollback Process:**
   ```bash
   # Stop services
   docker compose -f docker-compose.prod.yml down

   # Restore previous version
   git checkout previous-version-tag

   # Rebuild and restart
   docker compose -f docker-compose.prod.yml --profile build up frontend-build
   docker compose -f docker-compose.prod.yml up -d
   ```

## 🔍 Troubleshooting Guide

### Development Issues

1. **"This site can't be reached" at http://localhost:9000**
   - **Cause**: Frontend not started yet or build failed.
   - **Fix**: Ensure Docker Desktop is running, then:
     ```bash
     docker compose -f docker-compose.dev.yml up --build
     ```
   - **Check logs**:
     ```bash
     docker compose -f docker-compose.dev.yml logs --tail=200 frontend
     ```

2. **Backend health check fails at http://localhost:8080/health**
   - **Cause**: Backend still starting, database not ready, or migration issues.
   - **Fix**: Wait 30–60 seconds and refresh. Check for migration errors in logs.
   - **Check logs**:
     ```bash
     docker compose -f docker-compose.dev.yml logs --tail=200 backend
     ```

3. **Database connection issues**
   - **Cause**: Database container not ready or migration verification failed.
   - **Fix**: Run migration verification tool:
     ```bash
     cd apps/server/tools/migration-verifier
     go run main.go
     ```
   - **Reset database** (development only):
     ```bash
     docker compose -f docker-compose.dev.yml down -v
     docker compose -f docker-compose.dev.yml up --build
     ```

### Migration Issues

4. **Migration verification shows discrepancies**
   - **Cause**: Database migrations out of sync with migration files.
   - **Fix**: Review the migration verification report and investigate discrepancies.
   - **Check report**: `migration_verification_report.txt`

5. **Migration tool fails to connect**
   - **Cause**: Database not running or connection credentials incorrect.
   - **Fix**: Verify database is running and credentials in `.env` are correct.
   - **Test connection**:
     ```bash
     docker compose -f docker-compose.dev.yml exec db pg_isready -U postgres -d agromart
     ```

### Production Issues

6. **SSL/TLS certificate issues**
   - **Cause**: Domain configuration incorrect or Let's Encrypt rate limits.
   - **Fix**: Check Caddy logs and verify domain settings in `.env.production`.
   - **Check logs**:
     ```bash
     docker compose -f docker-compose.prod.yml logs caddy
     ```

7. **Database migration verification fails in production**
   - **Cause**: Production database connection issues or missing migrations.
   - **Fix**: Update environment variables and run verification:
     ```bash
     cd apps/server/tools/migration-verifier
     DB_HOST=your-production-host DB_PASSWORD=your-password go run main.go
     ```

8. **Performance issues in production**
   - **Cause**: Insufficient resources or misconfigured connection pooling.
   - **Fix**: Adjust environment variables in `.env.production`:
     ```bash
     APP_MAX_CONNS=100
     APP_MIN_CONNS=20
     ```

### Common Docker Issues

9. **Port already in use**
   - **Cause**: Another service using ports 3000 (frontend) or 8080 (backend).
   - **Fix**: Close conflicting applications or modify ports in compose files.

10. **Slow first run or "pulling image" messages**
    - **Normal**: Docker downloading images. Subsequent runs will be faster.
    - **Optimization**: Use `docker-compose.prod.yml` for faster subsequent builds.

## 🛠️ Migration Verification Tool

The project includes a dedicated migration verification tool for ensuring database consistency:

```bash
# Run migration verification
cd apps/server/tools/migration-verifier
go run main.go

# For production database
DB_HOST=prod-host DB_PASSWORD=prod-password go run main.go
```

**Tool Features:**
- ✅ Verifies all 14 migrations are applied
- ✅ Detects pending migrations
- ✅ Identifies missing migration files
- ✅ Generates detailed reports
- ✅ Supports both development and production databases

**Expected Output:**
- All 14 migrations should show "applied" status
- No pending or missing migrations
- Report saved to `migration_verification_report.txt`

## 📋 Environment Configuration Reference

### Default Development Settings
```bash
# API & Frontend
API_URL=http://localhost:8080
FRONTEND_URL=http://localhost:3000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=secret
DB_NAME=agromart

# Security (development only)
JWT_SECRET=supersecretjwt-change-me-for-local-dev-if-you-want
```

### Production Security Checklist
- [ ] Change all default passwords
- [ ] Generate secure 64+ character JWT secret
- [ ] Set production database credentials
- [ ] Configure domain name and SSL
- [ ] Set production email for TLS certificates
- [ ] Adjust connection pool settings for load
- [ ] Enable production logging level

## 🔐 Security & Access Management

### Default Credentials
- **Development Admin Account:**
  - Email: admin@example.com
  - Password: password

### Password Reset (Development)
1. **Reset database** (development only):
   ```bash
   docker compose -f docker-compose.dev.yml down -v
   docker compose -f docker-compose.dev.yml up --build
   ```

2. **Login with default credentials**:
   - Email: admin@example.com
   - Password: password

### Production Security
- **Change all default passwords** before production deployment
- **Generate secure JWT secret**: Use `openssl rand -base64 64`
- **Use strong database passwords**: Minimum 32 characters
- **Enable SSL/TLS**: Configured automatically with Let's Encrypt
- **Set production email**: For SSL certificate notifications

## 🧪 Testing & Verification

### API Testing
```bash
# Health check
curl http://localhost:8080/health

# Login via API
curl -X POST http://localhost:8080/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@example.com","password":"password"}'
```

### Migration Verification Testing
```bash
# Always run before deployment
cd apps/server/tools/migration-verifier
go run main.go

# Check the generated report
cat migration_verification_report.txt
```

### End-to-End Testing
```bash
# Run E2E tests (if configured)
cd apps/client
bun run test:e2e
```

## 📚 Additional Resources

### Getting Help
If you encounter issues:
1. **Ensure Docker Desktop is running** and updated to the latest version
2. **Run migration verification** to check database consistency
3. **Check service logs**:
   ```bash
   docker compose -f docker-compose.dev.yml ps
   docker compose -f docker-compose.dev.yml logs --tail=200
   ```
4. **Rebuild services**:
   ```bash
   docker compose -f docker-compose.dev.yml up --build
   ```

### Service Architecture
- **Database (db)**: PostgreSQL with automatic migration handling
- **Backend (server)**: Go API server with Echo framework
- **Frontend (client)**: Next.js application with React
- **Reverse Proxy (caddy)**: Handles SSL/TLS and load balancing

### Default Ports
- **Frontend**: http://localhost:9000
- **Backend API**: http://localhost:8080
- **Database**: localhost:5432 (internal only)
- **Production**: https://your-domain.com (SSL enabled)

## 🚀 Deployment Checklist

### Pre-Deployment
- [ ] Run migration verification tool
- [ ] Review migration_verification_report.txt
- [ ] Configure production environment variables
- [ ] Set secure passwords and JWT secrets
- [ ] Configure domain name and email for SSL

### Deployment Steps
- [ ] Clone repository on production server
- [ ] Configure .env.production
- [ ] Run migration verification against production database
- [ ] Build and start production services
- [ ] Verify all health endpoints
- [ ] Test core functionality
- [ ] Enable monitoring and logging

### Post-Deployment
- [ ] Set up automated backups
- [ ] Configure monitoring and alerts
- [ ] Test SSL certificate renewal
- [ ] Document custom configurations
- [ ] Set up log rotation

---

**You're all set!** 🎉

For local development, keep this guide handy. For production deployment, follow the comprehensive production setup instructions above. Always run migration verification before any deployment to ensure database consistency.