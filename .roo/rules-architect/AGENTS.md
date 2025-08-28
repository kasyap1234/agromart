# AGENTS.md - Architect Mode Rules

This file provides architect-specific guidance for the AgroMart IIA project.

## Core Architecture Patterns (Non-Obvious)

### Service Separation and Communication
- **Frontend-Backend separation**: Strict separation with API-first design
- **Service dependencies**: Backend requires database + MinIO, frontend calls backend API
- **No service unification**: deliberate choice to keep services independent
- **Health check integration**: All services require health endpoints for orchestration

### Non-Standard Technology Choices
- **Bun over npm**: Performance and testing requirements, not just developer preference
- **Go Task over npm scripts**: More flexible cross-platform orchestration
- **Port deviations**: Conscious choice to avoid standard Next.js ports
- **Monorepo with service isolation**: Maintains clean boundaries while sharing common code

### Critical Architectural Constraints
- **Docker health checks mandatory**: Required for all containerized services
- **Database port mismatch**: Different configurations for dev vs test environments
- **Test database isolation**: Ensures no interference between test and development data
- **File storage external**: MinIO required for file operations, not filesystem-based

## Component Architecture Decisions

### Frontend Architecture
- **Next.js 15 + React 19**: Latest stack with App Router patterns
- **Component patterns**: Custom UI library built on Radix UI components
- **State management**: Context providers for authentication and application state
- **API integration**: Axios with centralized base URL configuration

### Backend Architecture
- **Echo framework**: RESTful API with middleware for authentication, cors, rate-limiting
- **Database layer**: sqlc-generated code with PostgreSQL as primary datastore
- **Authentication**: JWT-based with custom middleware implementation
- **File handling**: MinIO integration with specific bucket structure

### Database Architecture
- **Schema evolution**: Migration-based approach with specific directory structure
- **Connection management**: Environment-specific connection strings
- **Health monitoring**: pg_isready integration for service monitoring
- **Multitenancy considerations**: User isolation in existing table structure

## Performance and Scalability Considerations

### Caching Strategy
- **Redis integration**: Already architected for caching layer in internal/cache/
- **Cache patterns**: Infrastructure ready for session, data, and response caching
- **Database optimization**: Ready for query optimization and connection pooling

### File Storage Architecture
- **MinIO S3 compatibility**: Object storage with bucket-based organization
- **Upload patterns**: Pre-defined routes for file upload and management
- **Access patterns**: Public and private object storage capabilities

### Monitoring and Observability
- **Health endpoints**: Built into all services for load balancer compatibility
- **Performance monitoring**: Ready for metrics collection and alerting
- **Security scanning**: gosec integration for security vulnerability detection

## Deployment Architecture

### Containerization Strategy
- **Multi-stage builds**: Optimized for both development and production
- **Service orchestration**: Docker Compose configurations for different environments
- **Health check requirements**: Every service must have proper health checks

### Configuration Management
- **Multiple environments**: Development, test, and production configurations
- **Secret management**: Environment variables with different values per environment
- **Configuration validation**: Built-in configuration validation at startup

### CI/CD Integration
- **Multi-environment support**: Different configurations load based on APP_ENV
- **Test integration**: Fully automated test suite with multiple test types
- **Performance regression**: k6 load testing integration for performance monitoring

## Security Architecture

### Authentication and Authorization
- **JWT implementation**: Custom JWT handling with proper token validation
- **Middleware integration**: Security middleware integrated into request pipeline
- **Role-based access**: User roles defined and enforced at API level

### Data Protection
- **Connection security**: SSL/TLS configuration for database connections
- **Data validation**: Built-in validation using go-playground/validator
- **Security scanning**: Automated security vulnerability scanning in CI

## Migration and Evolution Patterns

### Database Migration Strategy
- **Migration files**: Located in `apps/server/sql/schema/` subdirectory
- **Version control**: Migrations are versioned and applied in order
- **Environment isolation**: Separate databases prevent migration conflicts

### API Evolution
- **Version strategy**: RESTful API with potential for versioning
- **Backward compatibility**: Current API designed for gradual evolution
- **Documentation**: Swagger/OpenAPI documentation for API contract management

## Cost and Operational Considerations

### Resource Optimization
- **Container resource limits**: Docker configurations optimized for resource usage
- **Performance monitoring**: Ready for resource utilization tracking
- **Scalability patterns**: Architecture designed for horizontal scaling

### Maintenance Patterns
- **Dependency management**: Regular updates through both bun and go mod
- **Security updates**: Automated security scanning catches vulnerabilities
- **Performance monitoring**: Load testing integrated for performance regression detection

## Development Workflow Integration

### Local Development Architecture
- **Task orchestration**: Go Task manages complex startup sequences
- **Service dependencies** Docker Compose manages service relationships
- **Hot reloading**: Development servers provide hot reloading capabilities

### Testing Architecture
- **Unit test coverage**: 85% minimum coverage threshold across all components
- **Integration testing**: Full application integration with real database
- **E2E testing**: Complete user journey testing with database state management
- **Performance testing**: k6 integration for load and stress testing

## Future Scaling Considerations

### Microservice Evolution
- **Service boundaries**: Clean separation allows for future microservice extraction
- **API gateway**: Readiness for API gateway implementation
- **Event sourcing**: Architecture supports future event-driven patterns

### Cloud Architecture
- **Cloud provider agnostic**: No vendor lock-in with current architecture
- **Container orchestration**: Ready for Kubernetes deployment patterns
- **Multi-region support**: Architecture supports geographic distribution

This architectural guidance captures the deliberate design decisions and trade-offs made in the AgroMart IIA project. All patterns are based on actual implementation choices discovered through code analysis, not generic best practices. The architecture is designed for maintainability, scalability, and operational excellence while acknowledging current operational needs and future growth potential.