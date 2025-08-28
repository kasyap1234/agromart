# AGENTS.md - Debug Mode Rules

This file provides debug-specific guidance for the AgroMart IIA project.

## Debugging Setup and Tools

### Environment-Specific Debugging
- **Development**: Use `task dev:server:start` to run in background with full logging
- **Test Environment**: Database debugging requires `task test:db:up` first
- **Production**: Log levels controlled by `APP_ENV=production` variable

### Database Debugging
- **Health Check Commands**: `pg_isready -U postgres -h localhost` for instant status
- **Container Logs**: `docker logs agromart-postgres` for database-specific issues
- **Migration Verification**: Use `apps/server/tools/migration-verifier/` for schema issues
- **Query Debugging**: Enable logging in `internal/database/optimizer.go`

### Go Server Debugging
- **Run with Verbose**: `./apps/server/run_tests.sh` contains comprehensive logging setup
- **Echo Framework**: Default logging enabled via middleware, check `internal/middleware/`
- **Performance Profiling**: Built-in pprof endpoints available when APP_ENV=development
- **Cache Debugging**: Redis integration logs in `internal/cache/redis.go`

### Frontend Debugging
- **Bun Test Debugging**: Use `bun test --preload ./bun.test.js --inspect` for Node inspector
- **Browser DevTools**: Port 9000 exposes full browser debugging capabilities
- **E2E Debugging**: Playwright Inspector with `--debug` flag for step-through testing
- **React DevTools**: Available in development mode via browser extensions

## Critical Debugging Gotchas

### Port and Service Confusion
- **Database Ports**: Dev uses 5432, test uses 5436, but scripts may expect 5433
- **MinIO Console**: Always available on port 9001 for file operations
- **Backend API**: Available on 8080 during debugging, not 3000 or 9000

### Container-Specific Issues
- **Health Checks Required**: All services REQUIRE successful health checks before use
- **Container Naming**: Specific patterns like `agromart2-postgres-test` for test environments
- **Docker Dependencies**: Some debugging features require specific docker volumes mounted

### File and Path Issues
- **Relative Paths Critical**: All imports must use relative paths within project structure
- **Bun Lock Files**: Must use bun.lock for reproducible dependency debugging
- **Generated Files**: sqlc generates files that must be regenerated after schema changes

## Test Failure Debugging

### Unit Test Issues
- **Bun Setup Required**: Tests fail without `./bun.test.js` preprocessing
- **Coverage Thresholds**: Must maintain 85% coverage or tests will fail
- **DOM Mocking**: JSDOM environment critical for React component testing

### Integration Test Issues
- **Database Setup**: Tests require docker-compose.test.yml to be running
- **Tags Required**: Must use `-tags=integration` for database-integrated tests
- **Mock Data**: May require specific test data setup before debugging

### E2E Test Issues
- **Browser Compatibility**: Tests configured for multiple browsers with different behaviors
- **Video/Screenshots**: CI-only policies affect local debugging visibility
- **Global Setup**: Must pass before individual test debugging

## Logging and Monitoring

### Application Logs
- **Structured Logging**: Uses zerolog for consistent JSON-structured logs
- **Log Levels**: Console, file, and structured outputs available
- **Error Tracking**: Custom error handling in `internal/errors/` directory

### Performance Monitoring
- **Redis Cache Metrics**: Monitoring built into `internal/cache/` modules
- **Database Metrics**: Query optimization tracking in database optimizer
- **Memory Usage**: Go runtime metrics available in development mode

### System Health Checks
- **Container Health**: `/health` endpoints on all services for service status
- **Database Connectivity**: pg_isready integration for database health
- **Dependency Status**: MinIO and Redis health checks integrated into application

## Common Debugging Scenarios

### Database Connection Issues
1. Verify container is running: `docker ps | grep postgres`
2. Check health: `pg_isready -U postgres -h localhost -p 5432`
3. Try connection: `psql postgres://postgres:secret@localhost:5432/agromart`
4. Check logs: `docker logs agromart-postgres`

### Frontend Build Issues
1. Clear cache: `rm -rf apps/client/.next && rm -rf apps/client/node_modules`
2. Reinstall: `bun install` (never use npm)
3. Test build: `cd apps/client && bun run build`

### Docker Environment Issues
1. Reset environment: `task clean:db` then `task dev:setup`
2. Check container naming: match between docker-compose and test scripts
3. Verify port availability: `netstat -tlnp | grep :5432`

### API Communication Issues
1. Verify backend is running: `curl http://localhost:8080/health`
2. Check CORS settings: configured in Echo middleware
3. Test API endpoints directly before frontend integration

This file will be updated as new debugging patterns and common issues are discovered.