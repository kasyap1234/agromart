# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

# AgroMart - Agricultural Management System

AgroMart is a multi-tenant agricultural inventory management system built with Go (Echo framework), Next.js 15, PostgreSQL, and Docker. The system provides comprehensive inventory tracking, order management, analytics, and file handling capabilities.

## Quick Development Commands

### Local Development
```bash
# Start full development environment
docker compose -f docker-compose.dev.yml up --build

# Access points:
# - Frontend: http://localhost:9001
# - Backend API: http://localhost:8080/api
# - Health check: http://localhost:8080/health
# - Default login: admin@example.com / password
```

### Testing Commands
```bash
# Backend tests
task test:server:all              # Full backend test suite (unit + integration)
task test:server:unit             # Unit tests only
task test:server:integration      # Integration tests only
task test:db:up                   # Start test database
task test:db:migrate              # Run migrations on test DB
task test:db:down                 # Stop test database

# Frontend tests
cd apps/client && npm run test           # Unit tests
cd apps/client && npm run test:coverage # Unit tests with coverage
cd apps/client && npm run test:e2e      # E2E tests with Playwright
cd apps/client && npm run test:e2e:ui   # E2E tests with UI

# Generate SQLC code (after SQL changes)
task sqlc:generate
```

### Build and Production
```bash
# Production build (frontend + backend)
docker compose -f docker-compose.prod.yml --profile build up frontend-build
docker compose -f docker-compose.prod.yml up -d

# Database migration verification (run before any deployment)
cd apps/server/tools/migration-verifier && go run main.go
```

### Development Workflow
```bash
# Code quality
cd apps/client && npm run lint          # Lint frontend
cd apps/client && npm run lint:fix      # Auto-fix frontend issues
cd apps/client && npm run type-check    # TypeScript checking
go vet ./...                            # Go static analysis

# Database management
createdb agromart_test                  # Create test database
migrate -path "apps/server/sql/schema" -database "postgres://..." up
```

## High-Level Architecture

### Multi-Tenant System Design
- **Tenant Isolation**: All data is scoped by tenant_id, ensuring complete data separation
- **JWT Authentication**: Role-based access control (admin, manager, user) with tenant context
- **Database Per-Tenant**: Logical separation at the application layer, single database instance

### Backend Architecture (Go + Echo)
```
apps/server/
├── main.go                    # Application entry point, middleware setup
├── config/                    # Configuration management (Viper)
├── internal/
│   ├── auth/                  # JWT, password hashing, middleware
│   ├── database/              # Connection pool, migrations, config
│   ├── middleware/            # Security, validation, error handling
│   └── errors/                # Custom error types
├── [domain]/                  # Feature modules (products, customers, etc.)
│   ├── handlers.go            # HTTP handlers
│   ├── service.go             # Business logic
│   └── service_test.go        # Tests
└── db/                        # SQLC generated code (root level)
    ├── *.sql.go              # Generated query implementations
    └── models.go             # Database models
```

### Key Backend Patterns
- **SQLC for Type-Safe SQL**: All database queries in `apps/server/sql/queries/` generate type-safe Go code
- **Service Layer Architecture**: Each domain has handlers → service → database separation
- **Connection Pool Management**: Configured for high concurrency with pgxpool
- **Comprehensive Middleware**: Security headers, rate limiting, request ID, recovery
- **File Upload Integration**: MinIO for object storage with validation middleware

### Frontend Architecture (Next.js 15 + React 19)
```
apps/client/src/
├── app/                       # Next.js App Router structure
│   ├── auth/                  # Authentication pages
│   ├── dashboard/             # Main application pages
│   └── api/                   # API route handlers (if any)
├── components/
│   ├── ui/                    # Shadcn/ui components
│   └── [feature]/             # Feature-specific components
├── lib/
│   ├── api.ts                 # Axios client configuration
│   ├── auth.ts                # Client-side auth logic
│   └── utils.ts               # Utility functions
└── hooks/                     # Custom React hooks (SWR integration)
```

### Database Architecture (PostgreSQL)
- **14 Migration Files**: Complete schema in `apps/server/sql/schema/`
- **Key Tables**: tenants, users, products, inventory_items, batches, customers, suppliers, purchase_orders, sales_orders
- **Relationships**: Proper foreign key constraints with tenant isolation
- **Migration Verification**: Built-in tool to verify schema consistency

### Container Architecture
- **Development**: `docker-compose.dev.yml` - Hot reloading, bind mounts
- **Production**: `docker-compose.prod.yml` - Optimized builds, health checks
- **Test**: `docker-compose.test.yml` - Isolated test database on port 5436
- **Caddy Reverse Proxy**: Handles SSL, routing, and asset serving

## Development Guidelines

### Database Changes
1. **Never edit existing migrations** - always create new migration files
2. **Run migration verifier** before any deployment: `cd apps/server/tools/migration-verifier && go run main.go`
3. **Update SQLC** after schema changes: `task sqlc:generate`
4. **Test migrations** on isolated database: `task test:db:up && task test:db:migrate`

### Authentication Context
- All protected routes require JWT token in Authorization header: `Bearer <token>`
- Tenant context is extracted from JWT and available in handlers as `c.Get("tenant_id")`
- Role-based access enforced at route level with `authMiddleware.RequireRole("admin", "manager")`

### API Development Patterns
- **Consistent Response Format**: `{"success": bool, "data": any, "message": string}`
- **Error Handling**: Custom HTTP error handler preserves status codes
- **Request Validation**: Comprehensive input validation middleware
- **Rate Limiting**: Applied to file upload and sensitive endpoints

### File Upload System
- **MinIO Integration**: Object storage for files with bucket management
- **Validation Pipeline**: File type, size, and security validation
- **Tenant Isolation**: Files are scoped per tenant in separate buckets

### Testing Strategy
- **Unit Tests**: 85%+ coverage target for both frontend and backend
- **Integration Tests**: Database integration with test fixtures
- **E2E Tests**: Playwright with cross-browser testing
- **Performance Tests**: Load testing with automated CI checks

## Common Development Tasks

### Adding New API Endpoints
1. Create SQL queries in `apps/server/sql/queries/[domain].sql`
2. Run `task sqlc:generate` to generate Go code
3. Implement service layer in `apps/server/[domain]/service.go`
4. Add handlers in `apps/server/[domain]/handlers.go`
5. Register routes in `main.go` with appropriate middleware
6. Add tests for service and handler layers

### Adding New Frontend Pages
1. Create page component in `apps/client/src/app/[route]/page.tsx`
2. Implement data fetching with SWR hooks
3. Add form validation with React Hook Form + Zod
4. Style with Tailwind CSS and Shadcn/ui components
5. Add tests in `__tests__/` directory

### Database Schema Updates
1. Create new migration file in `apps/server/sql/schema/`
2. Update queries in `apps/server/sql/queries/` if needed
3. Run `task sqlc:generate` to update generated code
4. Test migration with `task test:db:migrate`
5. Verify with migration verification tool

## Environment Configuration

### Development Environment Variables
Key variables in `.env` (auto-created in dev):
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Secret for token signing (auto-generated)
- `MINIO_*`: Object storage configuration
- `APP_ENV`: Environment setting (development/production)

### Production Deployment
- Copy `.env.example` to `.env.production` and customize
- Generate secure JWT secret: `openssl rand -base64 64`
- Configure domain for SSL: `CADDY_DOMAIN=your-domain.com`
- Run migration verification before deployment

## Service Dependencies
- **PostgreSQL 17.5**: Primary database with connection pooling
- **MinIO**: Object storage for file uploads (optional in dev)
- **Redis**: Caching layer (referenced but not currently active)
- **Caddy**: Reverse proxy with automatic HTTPS

## Debugging and Troubleshooting

### Development Mode Instrumentation
When `APP_ENV=development`:
- **Swagger UI**: Available at `/swagger/index.html`
- **Prometheus Metrics**: Available at `/metrics`
- **pprof Profiling**: Available at `/debug/pprof/`
- **Detailed Logging**: Enhanced request/error logging

### Common Issues
- **Migration Failures**: Use migration verification tool and check schema consistency
- **Authentication Issues**: Verify JWT secret configuration and token expiration
- **File Upload Errors**: Check MinIO service availability and bucket permissions
- **CORS Issues**: Verify CORS configuration in main.go for your domain

### Health Monitoring
- **Backend Health**: `GET /health` and `GET /api/health`
- **Database Health**: Connection pool status in health response
- **Service Dependencies**: MinIO and other service availability checks

## Performance Considerations
- **Connection Pooling**: Configured for 25 max connections, 5 min connections
- **Compression**: Gzip middleware enabled for all responses
- **Query Optimization**: SQLC generates efficient prepared statements
- **Frontend Optimization**: Next.js 15 with React 19 optimizations, bundle analysis available


IMP : use bun for runtime and installing packages and not npm as it is faster and has more features like hot reloading and debugging
