# AGENTS.md - Ask Mode Rules

This file provides ask-specific guidance for the AgroMart IIA project.

## Documentation Structure and Context

### Project Architecture Overview
- **Monorepo Structure**: Frontend (`apps/client/`), Backend (`apps/server/`), Shared (`internal/`)
- **Primary Languages**: TypeScript/JavaScript (frontend), Go (backend)
- **Package Manager**: Bun (not npm/yarn) for frontend dependencies
- **Framework Stack**: Next.js 15 + React 19 (frontend), Echo + PostgreSQL (backend)

### Service Architecture
- **Frontend Service**: Next.js running on port 9000 (not standard 3000)
- **Backend Service**: Go Echo server running on port 8080
- **Database**: PostgreSQL with specific connection patterns
- **File Storage**: MinIO object storage on port 9001
- **Load Testing**: k6 integration for performance validation

### Key Configuration Files (Non-Standard Locations)
- **Frontend Config**: `apps/client/` contains Next.js variants, not root
- **Server Config**: `apps/server/` contains Go-specific configurations
- **Database**: `apps/server/sql/schema/` contains migrations
- **Docker**: Multiple compose files for different environments
- **CI/CD**: Task-based orchestration instead of npm/yarn scripts

## Common Question Categories

### Setup and Installation Questions
- **Frontend Dependencies**: Must use `bun install` - never npm/yarn
- **Development Environment**: Use `task dev:setup` for complete environment
- **Database Setup**: Separate dev (port 5432) and test (port 5436) databases
- **Docker Requirements**: Health checks required for all services

### Command and Execution Questions
- **Test Commands**: Frontend uses `bun test --preload ./bun.test.js`
- **Backend Tests**: Use `./apps/server/run_tests.sh --unit-only` for single coverage
- **Build Commands**: All through Task (e.g., `task build:all`)
- **Development Server**: Frontend on 9000, backend on 8080

### Architecture and Design Questions
- **API Patterns**: RESTful endpoints under `/api/` prefix
- **State Management**: Custom context providers in `apps/client/src/context/`
- **Data Flow**: Server to database, client to server API calls
- **File Upload**: MinIO integration with specific bucket patterns

### Testing and Quality Questions
- **Unit Tests**: 85% coverage threshold across all types
- **Integration Tests**: Require container setup with `-tags=integration`
- **E2E Tests**: Playwright with multi-browser support
- **Security Scanning**: gosec integration for Go code analysis

### Deployment and Operations Questions
- **Environment Variables**: Multiple `.env` files for different stages
- **Containerization**: Multi-stage Docker builds with health checks
- **Monitoring**: Built-in health endpoints and performance tracking
- **Caching**: Redis integration for performance optimization

## Documentation Sources (Critical for Accuracy)

### Primary Knowledge Sources
- **Configuration Files**: Located in both `apps/client/` and `apps/server/`
- **Database Schema**: `apps/server/sql/schema/` contains truth
- **API Documentation**: Swagger/OpenAPI generated documentation
- **Test Files**: Both unit and integration tests contain usage examples
- **Docker Compose**: Environment-specific container configurations

### Beware of Misleading Information
- **Standard Defaults**: This project deviates from Next.js/React/Go defaults
- **Root Directory**: May contain load testing only (k6), not core application
- **Package.json**: Root package.json may be for load testing, not development
- **Documentation**: Always verify against code, not assumptions

## Critical Context for Accurate Responses

### Environment-Specific Information
- **Development**: Ports 9000 (frontend), 8080 (backend), 5432 (database)
- **Testing**: Separate database on port 5436, health checks required
- **Production**: Different configuration patterns in prod-specific files

### Non-Obvious Behaviors
- **Bun Integration**: Not just faster npm - required for full functionality
- **Task Runner**: Go-based task orchestration instead of npm scripts
- **Health Checks**: Mandatory for all dockerized services
- **Test Setup**: Extensive JSDOM mocking for React component testing

### Common Confusions to Avoid
- **Port Confusion**: Frontend 9000 ≠ Backend 8080 ≠ MinIO 9001
- **Package Manager**: Never use npm - always bun for frontend
- **Test Structure**: Mixed `__tests__` and same-directory test patterns
- **Configuration Files**: Multiple variants for different environments

## Question Response Guidelines

### When Answering Technical Questions
1. **Verify Context**: Check if question is about frontend, backend, or full stack
2. **Check Configurations**: Reference actual config files, not defaults
3. **Provide Commands**: Include specific commands from Taskfile or package.json
4. **Cite Sources**: Point to specific files for validation
5. **Note Gotchas**: Highlight non-obvious requirements or deviations

### Common Question Patterns
- **"How do I run tests?"**: Point to run_tests.sh or bun test with specific flags
- **"How do I set up development?"**: Reference task commands and prerequisites
- **"Where is X configured?"**: Navigate to apps/client/ or apps/server/ subdirectories
- **"What port does X run on?"**: Provide specific port numbers with context
- **"How do I build for production?"**: Reference Taskfile build tasks

This documentation will evolve as new patterns and questions are identified in this codebase.