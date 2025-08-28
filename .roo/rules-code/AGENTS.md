# AGENTS.md - Code Mode Rules

This file provides code-specific guidance for the AgroMart IIA project.

## Code File Patterns and Conventions

### File Restrictions (Mode: code)
- **Editable Files**: Only files matching the pattern `\.go$|\.ts$|\.tsx$|\.js$|\.jsx$|\.json$|\.yml$|\.yaml$` can be edited/modified
- **Restricted Files**: Cannot edit files matching patterns like `\.jar$`, `\.exe$`, `\.dll$`, etc.
- **Documentation Files**: Files with `\.md$` pattern are restricted (use architect or ask mode)

### Project Structure Rules

- **Test File Placement**: Follow existing patterns in this codebase:
  - Unit tests: Colocated with source files (e.g., `service_test.go`)
  - E2E tests: Located in `apps/client/e2e/`
  - API tests: Located in `apps/client/__tests__/`

### Test Coverage Requirements

- **Minimum Coverage**: 85% required for branches, functions, lines, and statements
- **Special Test Setup**: Bun tests require `bun.test.js` preprocessing with full JSDOM mocking
- **Integration Tests**: Use `-tags=integration` and require database setup

## Critical Coding Patterns (Non-Obvious)

### Bun Package Manager
- **All Commands**: Must use `bun run` instead of `npm run` for ALL scripts
- **Test Commands**: Use `bun test --preload ./bun.test.js` for unit tests
- **Global Mocks**: Custom DOM, web API mocks required in bun.test.js
- **CI Requirement**: Bun commands work identically in CI (not npm)

### Port Configuration
- **Frontend**: Runs on port 9000 (not standard Next.js 3000)
- **Backend**: Serves API on 8080
- **MinIO**: Object storage console on port 9001

### Database and Caching
- **Test Database**: Separate from development with specific naming patterns
- **Health Checks**: Required `pg_isready -U postgres` pattern for containers
- **Redis Integration**: Use existing caching patterns from internal/cache/

### File Upload Architecture
- **MinIO Integration**: Required for file storage with specific bucket naming
- **API Structure**: File upload routes follow `/api/files/upload` pattern
- **Test Coverage**: File upload service requires full test coverage including error cases

## Go-Specific Patternsx

### Test Runner Usage
- **Comprehensive Tests**: Use `./apps/server/run_tests.sh --unit-only` for single execution
- **Security Scanning**: gosec integration required for full test suite
- **Report Generation**: jq dependency for parsing JSON test results

### Echo Framework Usage
- **Middleware**: Custom middleware located in `internal/middleware/`
- **Handler Patterns**: Follow existing CRUD handler patterns
- **Configuration**: Use viper for config management with specific patterns

## TypeScript/JavaScript Patterns

### Custom Libraries/Dependencies
- **Server Communication**: Always use relative API calls (not hardcoded localhost)
- **File Paths**: Use path aliases like `from '@/components'` pattern
- **Environment Variables**: Follow existing .env patterns for different deployments

## Critical Workflow Requirements

### Build Commands
- **Go Builds**: Use `go build -o` patterns specified in Taskfile.yml
- **TypeScript**: All builds through Bun, not tsc directly
- **Production**: CGO_ENABLED=0 required for Go production builds

### Deployment Configuration
- **Docker Images**: Multi-stage builds required with specific patterns
- **Environment Setup**: Use Taskfile.yml tasks for consistent setup
- **Health Checks**: All services must have proper health check endpoints

## Avoiding Common Mistakes

- **Package Manager**: NEVER use npm/yarn - always bun
- **Test Environment**: bun.test.js setup required for ALL tests
- **Database Ports**: Use correct ports (5432 dev, 5436 test) per environment
- **File Paths**: Always use relative paths within project structure
- **API Calls**: Use backend URL from environment, not hardcoded values

This file will be updated as new project-specific patterns are discovered.