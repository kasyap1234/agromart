# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Build, Lint, Test Commands

### Client/Frontend (Bun + Next.js)
- **Development server**: `bun run dev` (runs on port 9000, not 3000)
- **Custom test preprocessing**: Tests require `bun run test:jest` - includes bun.test.js setup with full JSDOM mocking
- **E2E testing**: `bun run test:e2e` - Playwright with CI-specific browser configuration
- **Coverage requirements**: 85% minimum coverage across branches, functions, lines, statements

### Backend (Go + Echo)
- **Single test coverage**: `./apps/server/run_tests.sh --unit-only` - comprehensive test runner with reporting
- **Integration tests**: `./apps/server/run_tests.sh --integration-only` - requires test database setup
- **Security scanning required**: Uses gosec for security analysis, installed via `go install github.com/securecodewarrior/gosec/v2/cmd/gosec@latest`
- **Advanced test runner**: Custom bash script generates HTML reports and JSON results (requires jq)

### Orchestration (Task)
- **Project coordination**: Uses Go Task instead of npm scripts, e.g., `task test:all` for full test suite
- **Database management**: `task dev:db:up` and `task test:db:up` use specific health check patterns
- **Cross-component builds**: `task build:all` builds both client and server

## Code Style Guidelines

### Non-Standard Dependencies
- **gosec required**: Security scanning tool must be installed for full linting suite
- **jq required**: JSON processing tool needed for test result parsing
- **sqlc**: Database code generation with specific yaml config location requirements

### File Organization
- **Test directory structure**: `__tests__` mixed with same-directory tests - Playwright in `apps/client/e2e/`
- **Config files in apps directories**: Next.js config variants (`next.config.prod.js`, `next.config.js`)
- **Separate lint configs**: ESLint flat config (`eslint.config.js`) with TypeScript integration

### Environment Setup
- **Docker health checks critical**: Database containers use `pg_isready -U postgres` pattern
- **Test database URL mismatch**: docker-compose.test.yml uses port 5436, but run_tests.sh expects 5433
- **MinIO setup required**: Object storage for file uploads with specific console port (9001)

### Critical Gotchas
- **Bun everywhere**: All npm commands must use `bun run` not `npm run`, including in CI
- **Service architecture**: Backend serves `/api` on 8080, frontend on 9000 - no port unification
- **Test dependencies**: Advanced reporting requires external tools (jq) and custom installations
- **Container naming**: Specific patterns required for health checks (e.g., `agromart2-postgres-test`)

## Testing Conventions

### Unit Tests
- **Coverage thresholds**: 85% enforced for all coverage types
- **Bun test environment**: Custom JSDOM setup with full browser API mocking in bun.test.js
- **Go test structure**: Standard testify usage with custom runners for comprehensive reporting

### Integration Tests
- **Database setup**: Uses separate test database with migrations
- **Docker dependency**: Requires test containers for full integration testing
- **Custom test tags**: `-tags=integration` required for integration test runs

### E2E Tests
- **CI browser setup**: Multiple browser testing with specific configuration per environment
- **Global setup/teardown**: Located in `apps/client/e2e/global-setup.ts`
- **Screenshot/video policies**: CI only failures, local preference for screenshots on all runs