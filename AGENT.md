# Agromart2 - Agent Guide

## Commands
- **Build**: `make build` (output: bin/agromart) or `task build:linux`
- **Run**: `make run` or `go run ./apps/server/cmd/api/main.go`
- **Test**: `make test` (runs all tests), `go test -v ./...` 
- **Single test**: `go test -v ./path/to/package -run TestName`
- **Lint**: `make lint` (golangci-lint), `make fmt` (gofmt)
- **DB**: `make sqlc` (regenerate), `make migrate-up/down`, `make docker-db-up`
- **Dev setup**: `make dev-setup` or `task dev:preview` (full stack)

## Architecture
- **Go 1.24+**, PostgreSQL, Echo v4, sqlc for type-safe SQL, pgx/v5 driver
- **Multi-tenant**: All entities scoped by tenant_id (UUID)
- **Structure**: apps/server/{cmd,handler,products,inventory,customers,suppliers,auth,sql/}
- **DB**: Generated code in db/, queries in apps/server/sql/queries/, migrations in sql/schema/
- **Services**: Service layer pattern with dependency injection, repositories for data access

## Code Style
- **Imports**: stdlib, external packages, internal packages (agromart2/...)
- **Naming**: PascalCase for exported, camelCase for unexported, descriptive names
- **Errors**: Wrap with context, use echo.NewHTTPError for HTTP responses
- **Structs**: JSON tags, pointer fields for optional updates (*string, *int)
- **DB**: Use sqlc queries, transactions via pgxpool, always include tenant_id in queries
- **Handlers**: Return `error`, use echo.Context, validate input, use service layer
