# AgroMart Production Deployment Guide

This comprehensive guide covers production deployment strategies for the AgroMart application, a full-stack inventory management system built with Next.js frontend, Go backend, and PostgreSQL database.

## Table of Contents

1. [Deployment Options](#deployment-options)
2. [Prerequisites](#prerequisites)
3. [Environment Configuration](#environment-configuration)
4. [Build Process](#build-process)
5. [Database Setup](#database-setup)
6. [Deployment Guides](#deployment-guides)
7. [Security Considerations](#security-considerations)
8. [Monitoring & Logging](#monitoring--logging)
9. [Backup & Recovery](#backup--recovery)
10. [Performance Optimization](#performance-optimization)
11. [SSL/HTTPS Setup](#sslhttps-setup)
12. [Scaling Strategies](#scaling-strategies)
13. [Troubleshooting](#troubleshooting)

## Deployment Options

### Docker-Based Deployment
- **Recommended for**: Most production environments
- **Pros**: Consistent environment, easy scaling, isolated services
- **Cons**: Requires Docker knowledge, higher resource usage

### Cloud Platform Deployment
- **AWS**: EC2, ECS, EKS for maximum control and scalability
- **DigitalOcean**: Droplets, App Platform for simplicity and cost-effectiveness
- **Heroku**: Fully managed PaaS for rapid deployment

### Traditional Hosting
- **VPS**: Direct server management with full control
- **Shared Hosting**: Limited control, lower cost

## Prerequisites

### System Requirements
- **CPU**: 2+ cores (4+ recommended)
- **Memory**: 4GB RAM minimum (8GB+ recommended)
- **Storage**: 20GB+ available space
- **Network**: Stable internet connection

### Software Dependencies
```bash
# Docker and Docker Compose
Docker >= 20.10
Docker Compose >= 2.0

# Or for native deployment:
Node.js >= 18.0.0
Go >= 1.19
PostgreSQL >= 13
Caddy >= 2.0 (or Nginx)
```

### Production Environment Requirements
- **Domain name** (for SSL certificates)
- **SSL certificate** (Let's Encrypt recommended)
- **Email service** (for TLS certificates and notifications)
- **Backup storage** (S3, DigitalOcean Spaces, etc.)
- **Monitoring service** (optional but recommended)

## Environment Configuration

### Production Environment Variables

Create a `.env.production` file with the following variables:

```bash
########## Database Configuration ##########
DB_HOST=localhost
DB_PORT=5432
DB_USER=agromart_prod
DB_PASSWORD=your-secure-db-password-here
DB_NAME=agromart_production
DB_MAX_CONNS=50
DB_MIN_CONNS=10
DB_MAX_CONN_LIFE_TIME=1h
DB_MAX_CONN_IDLE_TIME=30m

########## Backend Configuration ##########
APP_APPPORT=8080
APP_ENV=production
APP_LOG_LEVEL=warn
APP_JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-production-only
APP_MAX_CONNS=50
APP_MIN_CONNS=10
APP_MAX_CONN_LIFE_TIME=1h
APP_MAX_CONN_IDLE_TIME=30m
APP_HEALTH_CHECK_PERIOD=1m

########## Frontend Configuration ##########
NEXT_PUBLIC_API_URL=https://your-domain.com/api
NODE_ENV=production
NEXT_PUBLIC_APP_NAME=AgroMart
NEXT_PUBLIC_APP_VERSION=1.0.0

########## Security ##########
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-production-only

########## Docker Configuration ##########
DOCKER_IMAGE_BACKEND=agromart-backend
DOCKER_IMAGE_FRONTEND_BUILD=agromart-frontend-build
IMAGE_TAG=v1.0.0

########## Caddy/Reverse Proxy ##########
CADDY_DOMAIN=your-domain.com
EMAIL_FOR_TLS=admin@your-domain.com
PUBLIC_HTTP_PORT=80
PUBLIC_HTTPS_PORT=443
PUBLIC_API_URL=https://your-domain.com/api

########## Monitoring ##########
PROMETHEUS_ENABLED=true
GRAFANA_ENABLED=true
```

### Security Best Practices for Environment Variables

1. **Never commit secrets** to version control
2. **Use strong passwords** (minimum 32 characters)
3. **Rotate secrets** regularly (every 30-90 days)
4. **Use different secrets** for each environment
5. **Store secrets securely** (AWS Secrets Manager, HashiCorp Vault, etc.)

## Build Process

### Docker Build Process

1. **Build Frontend Assets**
```bash
# Build the frontend
docker build \
  --target frontend-build \
  --build-arg NEXT_PUBLIC_API_URL=https://your-domain.com/api \
  -t agromart-frontend:prod \
  ./apps/client
```

2. **Build Backend**
```bash
# Build the backend
docker build \
  --target runtime \
  -t agromart-backend:prod \
  .
```

3. **Build Migration Container** (if needed)
```bash
docker build \
  -f docker/migrate.Dockerfile \
  -t agromart-migrate:prod \
  .
```

### Native Build Process

1. **Frontend Build**
```bash
cd apps/client
npm ci --production
npm run build
npm run export  # For static hosting
```

2. **Backend Build**
```bash
# Install dependencies
go mod download

# Build the application
CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o agromart-server .

# Or for Docker
go build -o agromart-server .
```

## Database Setup

### PostgreSQL Production Configuration

1. **Create Production Database**
```sql
-- Create production user
CREATE USER agromart_prod WITH ENCRYPTED PASSWORD 'your-secure-password';

-- Create production database
CREATE DATABASE agromart_production OWNER agromart_prod;

-- Grant necessary permissions
GRANT ALL PRIVILEGES ON DATABASE agromart_production TO agromart_prod;

-- Set connection limits
ALTER USER agromart_prod CONNECTION LIMIT 50;
```

2. **Database Optimization**
```sql
-- Optimize for production workload
ALTER SYSTEM SET max_connections = '100';
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = '0.9';
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = '100';
```

3. **Run Migrations**
```bash
# Using Docker
docker run --rm \
  --network agromart-network \
  -e DB_HOST=db \
  -e DB_USER=agromart_prod \
  -e DB_PASSWORD=your-secure-password \
  -e DB_NAME=agromart_production \
  agromart-migrate:latest

# Or using Go migrate (if available)
migrate -path apps/server/sql/schema -database "postgres://user:password@localhost/dbname?sslmode=disable" up
```

### Database Backup Strategy

1. **Automated Backups**
```bash
# Create backup script
#!/bin/bash
BACKUP_DIR="/var/backups/agromart"
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -U agromart_prod -h localhost -d agromart_production -F c -b -v > "$BACKUP_DIR/agromart_$DATE.backup"
```

2. **Backup Rotation**
```bash
# Keep last 7 daily backups, 4 weekly backups, 12 monthly backups
find /var/backups -name "agromart_*.backup" -mtime +7 -delete
```

## Deployment Guides

### Docker-Based Production Deployment

1. **Prepare Production Environment**
```bash
# Clone repository
git clone https://github.com/your-org/agromart.git
cd agromart

# Switch to production branch/tag
git checkout v1.0.0

# Create production environment file
cp .env.example .env.production
# Edit .env.production with production values
```

2. **Deploy with Docker Compose**
```bash
# Build and start all services
docker compose -f docker-compose.prod.yml up -d --build

# Or build and deploy separately
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
```

3. **Verify Deployment**
```bash
# Check service status
docker compose -f docker-compose.prod.yml ps

# Check logs
docker compose -f docker-compose.prod.yml logs -f

# Test health endpoints
curl -f https://your-domain.com/health
curl -f https://your-domain.com/api/health
```

### AWS Deployment

#### Option 1: EC2 with Docker

1. **Launch EC2 Instance**
```bash
# Choose Amazon Linux 2 AMI
# Instance type: t3.medium or larger
# Security group: Open ports 80, 443, 22
```

2. **Configure EC2 Instance**
```bash
# Install Docker
sudo yum update -y
sudo amazon-linux-extras install docker
sudo systemctl enable docker
sudo systemctl start docker

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/2.0.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

3. **Deploy Application**
```bash
# Clone and deploy as above
git clone https://github.com/your-org/agromart.git
cd agromart
docker compose -f docker-compose.prod.yml up -d --build
```

#### Option 2: ECS Fargate

1. **Create ECS Cluster**
```bash
aws ecs create-cluster --cluster-name agromart-cluster
```

2. **Create Task Definition**
```json
{
  "family": "agromart-task",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "containerDefinitions": [
    {
      "name": "agromart-backend",
      "image": "your-registry/agromart-backend:latest",
      "essential": true,
      "portMappings": [
        {
          "containerPort": 8080,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {"name": "APP_ENV", "value": "production"}
      ],
      "secrets": [
        {"name": "DB_PASSWORD", "valueFrom": "arn:aws:secretsmanager:region:account:secret:agromart-db"}
      ]
    }
  ]
}
```

### DigitalOcean Deployment

#### App Platform (Recommended)

1. **Create App Spec**
```yaml
name: agromart
services:
  - name: backend
    source_dir: .
    github:
      repo: your-org/agromart
      branch: main
      deploy_on_push: true
    dockerfile_path: Dockerfile
    envs:
      - key: APP_ENV
        value: production
      - key: DB_HOST
        value: ${agromart-db.HOSTNAME}
      - key: DB_PORT
        value: ${agromart-db.PORT}
    instance_count: 1
    instance_size_slug: basic-xxs

  - name: frontend
    source_dir: apps/client
    github:
      repo: your-org/agromart
      branch: main
      deploy_on_push: true
    dockerfile_path: Dockerfile
    envs:
      - key: NEXT_PUBLIC_API_URL
        value: ${backend.PUBLIC_URL}/api
    instance_count: 1
    instance_size_slug: basic-xxs

databases:
  - name: agromart-db
    engine: PG
    version: 13
    size: db-s-1vcpu-1gb
    num_nodes: 1
```

#### Droplet Deployment

1. **Create Droplet**
```bash
# Ubuntu 22.04 LTS
# Basic plan with 2GB RAM
# Add your SSH key
```

2. **Setup Firewall**
```bash
# Configure UFW
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable
```

3. **Deploy Application**
```bash
# Install Docker and deploy as in Docker section
```

### Heroku Deployment

1. **Prepare Application**
```bash
# Create Procfile
echo "web: agromart-server" > Procfile

# Add heroku remote
heroku create agromart-prod

# Add PostgreSQL addon
heroku addons:create heroku-postgresql:hobby-dev -a agromart-prod
```

2. **Configure Environment**
```bash
heroku config:set APP_ENV=production
heroku config:set APP_APPPORT=$PORT
heroku config:set APP_JWT_SECRET=your-secret-here
```

3. **Deploy**
```bash
git push heroku main
```

## Security Considerations

### Network Security

1. **Firewall Configuration**
```bash
# UFW rules for production
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw --force enable
```

2. **SSL/TLS Configuration**
```bash
# Generate strong Diffie-Hellman parameters
sudo openssl dhparam -out /etc/ssl/certs/dhparam.pem 2048

# Configure SSL in Caddyfile
:443 {
    tls your-email@example.com {
        protocols tls1.2 tls1.3
        ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256
    }
}
```

3. **Database Security**
```sql
-- Create read-only user for monitoring
CREATE USER agromart_monitor WITH ENCRYPTED PASSWORD 'monitor-password';
GRANT CONNECT ON DATABASE agromart_production TO agromart_monitor;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO agromart_monitor;

-- Enable row-level security where appropriate
ALTER TABLE sensitive_table ENABLE ROW LEVEL SECURITY;
```

### Application Security

1. **API Security**
```go
// CORS configuration
corsConfig := cors.Config{
    AllowedOrigins: []string{"https://your-domain.com"},
    AllowedMethods: []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
    AllowedHeaders: []string{"*"},
    AllowCredentials: true,
    MaxAge: 12 * time.Hour,
}
```

2. **Rate Limiting**
```go
// Implement rate limiting middleware
limiter := rate.NewLimiter(rate.Every(time.Minute), 100)
```

3. **Input Validation**
```go
// Use strict validation for all inputs
validate := validator.New()
validate.RegisterValidation("strong_password", validateStrongPassword)
```

## Monitoring & Logging

### Application Monitoring

1. **Health Checks**
```bash
# Backend health check
curl -f https://your-domain.com/api/health

# Frontend health check
curl -f https://your-domain.com/health

# Database health check
pg_isready -h localhost -p 5432 -U agromart_prod
```

2. **Prometheus Metrics**
```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'agromart-backend'
    static_configs:
      - targets: ['backend:8080']
    metrics_path: '/metrics'

  - job_name: 'agromart-frontend'
    static_configs:
      - targets: ['frontend:3000']
    metrics_path: '/metrics'
```

3. **Grafana Dashboard**
```bash
# Install Grafana
docker run -d -p 3000:3000 grafana/grafana

# Import dashboard JSON
# Configure Prometheus as data source
```

### Logging Configuration

1. **Centralized Logging**
```bash
# Install ELK stack or use cloud logging service
docker run -d -p 5601:5601 -p 9200:9200 -p 5044:5044 sebp/elk

# Configure log shipping
docker run -d \
  --log-driver=gelf \
  --log-opt gelf-address=udp://localhost:12201 \
  your-app
```

2. **Log Rotation**
```bash
# Configure logrotate
cat > /etc/logrotate.d/agromart << EOF
/var/log/agromart/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 0644 agromart agromart
    postrotate
        docker compose -f /path/to/docker-compose.prod.yml restart backend
    endscript
}
EOF
```

## Backup & Recovery

### Automated Backup Strategy

1. **Database Backups**
```bash
#!/bin/bash
# Daily database backup
BACKUP_DIR="/var/backups/agromart"
DATE=$(date +%Y%m%d_%H%M%S)
DB_CONTAINER="agromart-db"

# Create backup
docker exec $DB_CONTAINER pg_dump -U agromart_prod agromart_production > "$BACKUP_DIR/agromart_$DATE.sql"

# Compress backup
gzip "$BACKUP_DIR/agromart_$DATE.sql"

# Upload to cloud storage
aws s3 cp "$BACKUP_DIR/agromart_$DATE.sql.gz" s3://agromart-backups/

# Clean old backups (keep last 30 days)
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete
```

2. **Application Data Backup**
```bash
# Backup uploaded files, configs, etc.
tar -czf "/var/backups/agromart/app_$DATE.tar.gz" \
    /path/to/uploads \
    /path/to/configs \
    --exclude "*.tmp"
```

### Disaster Recovery

1. **Recovery Procedures**
```bash
#!/bin/bash
# Database recovery script
BACKUP_FILE="agromart_20231201_120000.sql.gz"

# Stop application
docker compose -f docker-compose.prod.yml stop

# Restore database
gunzip -c "/var/backups/agromart/$BACKUP_FILE" | docker exec -i agromart-db psql -U agromart_prod -d agromart_production

# Start application
docker compose -f docker-compose.prod.yml start

# Verify recovery
curl -f https://your-domain.com/health
```

2. **Point-in-Time Recovery**
```sql
-- Restore to specific point in time
RECOVERY_TARGET_TIME='2023-12-01 12:00:00 EST';

-- Restore base backup
pg_restore -U agromart_prod -d agromart_production /path/to/backup.sql

-- Apply WAL files up to target time
```

## Performance Optimization

### Database Optimization

1. **Indexing Strategy**
```sql
-- Create indexes for frequently queried columns
CREATE INDEX CONCURRENTLY idx_products_name ON products(name);
CREATE INDEX CONCURRENTLY idx_products_category ON products(category_id);
CREATE INDEX CONCURRENTLY idx_batches_expiry ON batches(expiry_date);
CREATE INDEX CONCURRENTLY idx_inventory_product ON inventory(product_id);

-- Composite indexes for complex queries
CREATE INDEX CONCURRENTLY idx_sales_date_product ON sales(sale_date, product_id);
```

2. **Query Optimization**
```sql
-- Analyze query performance
EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM products WHERE category_id = $1;

-- Create partial indexes
CREATE INDEX CONCURRENTLY idx_active_products ON products(id) WHERE active = true;
```

### Application Optimization

1. **Caching Strategy**
```go
// Redis caching for frequently accessed data
cache := redis.NewClient(&redis.Options{
    Addr: "localhost:6379",
    Password: "",
    DB: 0,
})

func GetProductWithCache(id int) (*Product, error) {
    cacheKey := fmt.Sprintf("product:%d", id)

    if cached, err := cache.Get(cacheKey).Result(); err == nil {
        return unmarshalProduct(cached)
    }

    product, err := db.GetProduct(id)
    if err != nil {
        return nil, err
    }

    cache.Set(cacheKey, marshalProduct(product), time.Hour)
    return product, nil
}
```

2. **Frontend Optimization**
```javascript
// Next.js optimization
// next.config.js
module.exports = {
  images: {
    domains: ['your-domain.com'],
    formats: ['image/webp', 'image/avif'],
  },
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['lucide-react'],
  },
}
```

### Infrastructure Optimization

1. **Resource Allocation**
```yaml
# Docker resource limits
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
```

2. **Connection Pooling**
```go
// Optimize database connection pool
db.SetMaxOpenConns(50)
db.SetMaxIdleConns(10)
db.SetConnMaxLifetime(time.Hour)
db.SetConnMaxIdleTime(30 * time.Minute)
```

## SSL/HTTPS Setup

### Let's Encrypt with Caddy

1. **Automatic SSL with Caddy**
```caddyfile
# Caddyfile
your-domain.com {
    encode zstd gzip

    # Automatic HTTPS with Let's Encrypt
    tls admin@your-domain.com

    # API routes
    @api path /api/*
    handle @api {
        reverse_proxy backend:8080
    }

    # Frontend routes
    handle {
        reverse_proxy frontend:3000
    }

    # Security headers
    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
        X-XSS-Protection "1; mode=block"
        Referrer-Policy "strict-origin-when-cross-origin"
    }
}
```

2. **SSL Certificate Management**
```bash
# Check certificate status
curl -I https://your-domain.com

# Force certificate renewal
caddy reload

# View certificate info
openssl s_client -connect your-domain.com:443 -servername your-domain.com
```

### Manual SSL Setup

1. **Generate Self-Signed Certificate** (for testing)
```bash
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes \
    -subj "/C=US/ST=State/L=City/O=Organization/CN=your-domain.com"
```

2. **Configure Nginx for SSL**
```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;

    location /api/ {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Scaling Strategies

### Horizontal Scaling

1. **Load Balancer Setup**
```nginx
# Nginx load balancer configuration
upstream backend_servers {
    server backend1:8080 weight=1;
    server backend2:8080 weight=1;
    server backend3:8080 weight=1;
}

server {
    listen 80;
    server_name your-domain.com;

    location /api/ {
        proxy_pass http://backend_servers;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Host $host;
    }
}
```

2. **Docker Swarm Scaling**
```bash
# Initialize swarm
docker swarm init

# Deploy stack
docker stack deploy -c docker-compose.prod.yml agromart

# Scale services
docker service scale agromart_backend=3
docker service scale agromart_frontend=2
```

3. **Kubernetes Scaling**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: agromart-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: agromart-backend
  template:
    metadata:
      labels:
        app: agromart-backend
    spec:
      containers:
      - name: agromart-backend
        image: agromart-backend:latest
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        ports:
        - containerPort: 8080
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: agromart-backend-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: agromart-backend
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

### Vertical Scaling

1. **Resource Optimization**
```bash
# Monitor resource usage
docker stats

# Adjust container resources
docker update --cpus 2 --memory 2g agromart-backend
```

2. **Database Scaling**
```sql
-- Increase connection limits
ALTER SYSTEM SET max_connections = '200';

-- Increase shared buffers
ALTER SYSTEM SET shared_buffers = '1GB';

-- Reload configuration
SELECT pg_reload_conf();
```

### Performance Monitoring

1. **Key Metrics to Monitor**
- **Response Time**: API response times < 200ms
- **Error Rate**: < 1% error rate
- **CPU Usage**: < 80% average
- **Memory Usage**: < 85% average
- **Database Connections**: < 80% of max connections
- **Disk I/O**: Monitor for bottlenecks

2. **Alerting Setup**
```yaml
# Prometheus alerting rules
groups:
  - name: agromart
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.05
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High error rate detected"
```

## Troubleshooting

### Common Issues and Solutions

1. **Database Connection Issues**
```bash
# Check database connectivity
pg_isready -h localhost -p 5432 -U agromart_prod

# Check connection pool
SELECT count(*) FROM pg_stat_activity WHERE datname = 'agromart_production';

# Reset connection pool
docker compose -f docker-compose.prod.yml restart backend
```

2. **Memory Issues**
```bash
# Check memory usage
docker stats

# Increase container memory limit
docker update --memory 2g --memory-swap 4g agromart-backend

# Check for memory leaks in Go
go tool pprof http://localhost:8080/debug/pprof/heap
```

3. **Performance Issues**
```bash
# Profile Go application
go tool pprof http://localhost:8080/debug/pprof/profile

# Check slow queries
SELECT query, total_time, calls FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10;

# Optimize database
VACUUM ANALYZE;
REINDEX DATABASE agromart_production;
```

4. **SSL/HTTPS Issues**
```bash
# Check SSL certificate
openssl s_client -connect your-domain.com:443 -servername your-domain.com

# Renew Let's Encrypt certificate
certbot renew

# Check Caddy logs
docker logs agromart-caddy
```

5. **Deployment Issues**
```bash
# Check container logs
docker compose -f docker-compose.prod.yml logs -f

# Verify environment variables
docker exec agromart-backend env

# Test health endpoints
curl -v https://your-domain.com/health
curl -v https://your-domain.com/api/health
```

### Emergency Procedures

1. **Rollback Deployment**
```bash
# Quick rollback to previous version
docker compose -f docker-compose.prod.yml down
docker image ls agromart-backend  # Find previous tag
docker tag agromart-backend:v1.0.0 agromart-backend:rollback
docker compose -f docker-compose.prod.yml up -d
```

2. **Database Recovery**
```bash
# Emergency database restore
docker exec -i agromart-db psql -U agromart_prod -d agromart_production < /path/to/backup.sql
```

3. **Service Restart Procedures**
```bash
# Restart specific service
docker compose -f docker-compose.prod.yml restart backend

# Full system restart
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d
```

### Debug Mode

1. **Enable Debug Logging**
```bash
# Temporary debug logging
docker compose -f docker-compose.prod.yml exec backend sh -c 'export APP_LOG_LEVEL=debug && ./agromart-server'

# Check debug logs
docker compose -f docker-compose.prod.yml logs -f backend
```

2. **Database Debug Queries**
```sql
-- Check active queries
SELECT pid, query, state, wait_event FROM pg_stat_activity WHERE state != 'idle';

-- Check locks
SELECT locktype, relation::regclass, mode, pid FROM pg_locks WHERE NOT granted;

-- Check table sizes
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables WHERE schemaname = 'public' ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

## Infrastructure as Code Examples

### Terraform AWS Deployment

```hcl
# main.tf
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

# VPC
resource "aws_vpc" "agromart_vpc" {
  cidr_block = "10.0.0.0/16"
  tags = {
    Name = "agromart-vpc"
  }
}

# ECS Cluster
resource "aws_ecs_cluster" "agromart_cluster" {
  name = "agromart-cluster"
}

# RDS Database
resource "aws_db_instance" "agromart_db" {
  identifier           = "agromart-db"
  engine              = "postgres"
  engine_version      = "13.7"
  instance_class      = "db.t3.micro"
  allocated_storage   = 20
  username           = "agromart_prod"
  password           = var.db_password
  db_name            = "agromart_production"
  skip_final_snapshot = true
  vpc_security_group_ids = [aws_security_group.db_sg.id]
}

# Application Load Balancer
resource "aws_lb" "agromart_alb" {
  name               = "agromart-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb_sg.id]
  subnets           = aws_subnet.public.*.id
}

# ECS Task Definition
resource "aws_ecs_task_definition" "agromart_backend" {
  family                   = "agromart-backend"
  network_mode            = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                     = "256"
  memory                  = "512"
  execution_role_arn      = aws_iam_role.ecs_execution_role.arn

  container_definitions = jsonencode([
    {
      name  = "agromart-backend"
      image = "your-registry/agromart-backend:latest"
      portMappings = [
        {
          containerPort = 8080
          hostPort      = 8080
        }
      ]
      environment = [
        {
          name  = "APP_ENV"
          value = "production"
        }
      ]
      secrets = [
        {
          name      = "DB_PASSWORD"
          valueFrom = aws_secretsmanager_secret.db_password.arn
        }
      ]
    }
  ])
}
```

### Ansible Deployment Playbook

```yaml
# deploy.yml
---
- name: Deploy AgroMart to production
  hosts: production
  become: yes
  vars:
    app_version: "v1.0.0"
    domain_name: "your-domain.com"

  pre_tasks:
    - name: Update system packages
      apt:
        update_cache: yes
        upgrade: yes

    - name: Install Docker
      apt:
        name: docker.io
        state: present

    - name: Install Docker Compose
      get_url:
        url: https://github.com/docker/compose/releases/download/2.0.0/docker-compose-linux-x86_64
        dest: /usr/local/bin/docker-compose
        mode: '0755'

  tasks:
    - name: Create application directory
      file:
        path: /opt/agromart
        state: directory
        owner: agromart
        group: agromart

    - name: Clone application repository
      git:
        repo: https://github.com/your-org/agromart.git
        dest: /opt/agromart
        version: "{{ app_version }}"
        force: yes

    - name: Create production environment file
      template:
        src: templates/.env.production.j2
        dest: /opt/agromart/.env.production
        owner: agromart
        group: agromart
        mode: '0600'

    - name: Create Docker network
      docker_network:
        name: agromart-network
        state: present

    - name: Deploy application stack
      docker_compose:
        project_src: /opt/agromart
        files:
          - docker-compose.prod.yml
        state: present
        build: yes

    - name: Wait for services to be healthy
      uri:
        url: "https://{{ domain_name }}/health"
        validate_certs: no
      register: health_check
      until: health_check.status == 200
      retries: 30
      delay: 10

  post_tasks:
    - name: Configure firewall
      ufw:
        rule: allow
        port: "{{ item }}"
      loop:
        - "80"
        - "443"

    - name: Setup backup cron job
      cron:
        name: "agromart-database-backup"
        minute: "0"
        hour: "2"
        job: "/opt/agromart/scripts/backup.sh"
```

This comprehensive deployment guide provides everything needed to deploy AgroMart to production across various platforms with security, monitoring, and scalability best practices.