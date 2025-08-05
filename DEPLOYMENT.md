# Documentation moved

Deployment notes have been consolidated into README.md Quick Start for local development. For production, use docker-compose.prod.yml and the Dockerfiles under docker/. Keep environment variables in sync with README.

This guide covers the complete deployment process for the AgroMart agricultural management system.

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     Caddy       │    │    Frontend     │    │    Backend      │
│ Reverse Proxy   │────│   (Next.js)     │────│     (Go)        │
│   TLS/HTTP      │    │     Port 3000   │    │   Port 8080     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                                              │
         │              ┌─────────────────┐            │
         └──────────────│   PostgreSQL    │────────────┘
                        │   Database      │
                        │   Port 5432     │
                        └─────────────────┘
                                 │
                        ┌─────────────────┐
                        │     Redis       │
                        │   (Caching)     │
                        │   Port 6379     │
                        └─────────────────┘
```

## 📋 Prerequisites

### System Requirements
- **OS**: Linux (Ubuntu 20.04+ recommended), macOS, or Windows with WSL2
- **RAM**: Minimum 4GB, Recommended 8GB+
- **Storage**: Minimum 20GB free space
- **CPU**: 2+ cores recommended

### Required Software
- Docker 20.10+
- Docker Compose 2.0+
- Git
- curl (for health checks)

### Installation Commands
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install docker.io docker-compose git curl

# macOS (with Homebrew)
brew install docker docker-compose git

# Enable Docker service
sudo systemctl enable docker
sudo systemctl start docker
```

## 🚀 Quick Start

### 1. Clone and Setup
```bash
git clone <repository-url>
cd agromart2

# Copy environment file
cp .env.example .env

# Edit environment variables
nano .env
```

### 2. Deploy Development Environment
```bash
./scripts/deploy.sh dev
```

### 3. Deploy Production Environment
```bash
# Create production environment file
cp .env.example .env.production

# Edit production values (IMPORTANT!)
nano .env.production

# Deploy to production
./scripts/deploy.sh prod
```

## 🔧 Environment Configuration

### Development (.env)
```env
# Database
APP_DB_HOST=localhost
APP_DB_PORT=5432
APP_DB_USER=postgres
APP_DB_PASSWORD=password
APP_DB_NAME=agromart

# Application
APP_APPPORT=8080
LOG_LEVEL=debug

# Security (development only)
JWT_SECRET=dev-secret-key-not-for-production
```

### Production (.env.production)
```env
# Database (Use strong passwords!)
APP_DB_HOST=db
APP_DB_USER=postgres
APP_DB_PASSWORD=your-super-secure-password-here
APP_DB_NAME=agromart

# Application
APP_APPPORT=8080
LOG_LEVEL=warn

# Security (MUST CHANGE!)
JWT_SECRET=your-64-character-super-secure-jwt-secret-key-here

# Connection Pool (Production optimized)
MAX_CONNS=50
MIN_CONNS=10
MAX_CONN_LIFE_TIME=2h
MAX_CONN_IDLE_TIME=1h
```

## 🐳 Docker Deployment

### Available Compose Files
- `docker-compose.yml` - Development environment
- `docker-compose.prod.yml` - Production environment with Caddy

### Manual Docker Commands
```bash
# Development
docker-compose up -d

# Production
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Container Health Checks
All containers include health checks:
- **Database**: `pg_isready` check
- **Backend**: HTTP health endpoint `/health`
- **Frontend**: HTTP availability check
- **Caddy**: HTTP health endpoint

## 🔍 Health Monitoring

### Health Check Endpoints
- **Application Health**: `GET /health`
- **Readiness Check**: `GET /ready` (Kubernetes)
- **Liveness Check**: `GET /live` (Kubernetes)

### Example Health Response
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "version": "1.0.0",
  "checks": {
    "database": "healthy",
    "memory": "healthy"
  }
}
```

### Monitoring Commands
```bash
# Check all services
docker-compose ps

# Check specific service health
curl http://localhost:8080/health

# View service logs
docker-compose logs backend
docker-compose logs frontend
docker-compose logs db
```

## 💾 Database Management

### Migrations
Database migrations are automatically applied during deployment.

Manual migration commands:
```bash
# Run migrations
make migrate-up

# Rollback migrations
make migrate-down

# Create new migration
make migrate-create NAME=add_new_feature
```

### Backup and Restore
```bash
# Create backup
./scripts/backup.sh prod

# Restore from backup
docker-compose exec db psql -U postgres -d agromart < backup_file.sql
```

### Backup Schedule
- **Development**: Manual backups
- **Production**: Automated daily backups (recommended)

## 🔒 Security Configuration

### Production Security Checklist
- [ ] Change default passwords
- [ ] Generate secure JWT secret (64+ characters)
- [ ] Enable HTTPS with SSL certificates
- [ ] Configure firewall rules
- [ ] Set up rate limiting
- [ ] Enable database SSL
- [ ] Configure CORS properly
- [ ] Set up monitoring and alerting

### SSL/HTTPS Setup
- Caddy handles automatic HTTPS via ACME when using a real domain.
- For localhost or non-public domains, use HTTP (:80) configuration in Caddyfile.
- Update NEXT_PUBLIC_API_URL to the correct scheme and host before building frontend.

### Rate Limiting
- If you need rate limiting, implement it at the application layer or via Caddy global options/plugins.

## 📊 Performance Optimization

### Database Optimization
- Connection pooling configured
- Indexes on frequently queried columns
- Query optimization with EXPLAIN ANALYZE

### Application Optimization
- Gzip compression enabled
- Static asset caching
- Database connection pooling
- Structured logging

### Scaling Recommendations
- **Horizontal**: Multiple backend instances behind load balancer
- **Vertical**: Increase container resource limits
- **Database**: Read replicas for read-heavy workloads
- **Caching**: Redis for session and query caching

## 🚨 Troubleshooting

### Common Issues

#### Database Connection Failed
```bash
# Check database status
docker-compose ps db

# Check database logs
docker-compose logs db

# Verify environment variables
docker-compose exec backend env | grep DB
```

#### Backend Health Check Failed
```bash
# Check backend logs
docker-compose logs backend

# Check if port is accessible
curl -v http://localhost:8080/health

# Restart backend service
docker-compose restart backend
```

#### Frontend Not Loading
```bash
# Check frontend logs
docker-compose logs frontend

# Verify API connection
curl http://localhost:8080/health

# Check environment variables
docker-compose exec frontend env | grep NEXT_PUBLIC
```

### Log Locations
- **Application logs**: `docker compose logs [service]`
- **Caddy logs**: `docker compose logs caddy`
- **Database logs**: PostgreSQL container logs

### Performance Issues
```bash
# Check resource usage
docker stats

# Check database performance
docker-compose exec db psql -U postgres -c "SELECT * FROM pg_stat_activity;"

# Monitor API response times
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:8080/health
```

## 🔄 CI/CD Integration

### GitHub Actions Example
```yaml
name: Deploy to Production
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy
        run: ./scripts/deploy.sh prod
```

### Deployment Workflow
1. Code push to main branch
2. Automated tests run
3. Docker images built
4. Health checks performed
5. Production deployment
6. Post-deployment verification

## 📞 Support

### Getting Help
- Check logs first: `docker-compose logs`
- Verify environment configuration
- Check health endpoints
- Review this documentation

### Maintenance Tasks
- Regular database backups
- Log rotation
- Security updates
- Performance monitoring
- SSL certificate renewal

---

## 📝 Quick Reference

### Essential Commands
```bash
# Deploy development
./scripts/deploy.sh dev

# Deploy production
./scripts/deploy.sh prod

# Create backup
./scripts/backup.sh prod

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Health check
curl http://localhost:8080/health
```

### Important Files
- `docker-compose.yml` - Development configuration
- `docker-compose.prod.yml` - Production configuration
- `.env.production` - Production environment variables
- `Caddyfile` - Caddy reverse proxy configuration
- `scripts/deploy.sh` - Deployment script
- `scripts/backup.sh` - Backup script