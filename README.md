# Agromart - Modern Agricultural Management System

A modern, scalable agricultural management system built with Go, PostgreSQL, and sqlc.

## Architecture

This application follows modern Go best practices using:

- **Database**: PostgreSQL with pgx/v5 driver
- **Code Generation**: sqlc for type-safe SQL queries
- **Web Framework**: Echo v4
- **Logging**: Zerolog
- **Configuration**: Viper
- **Migrations**: golang-migrate (optional)
- **Containerization**: Docker & Docker Compose

## Features

- **Multi-tenant Architecture**: Secure tenant isolation
- **Product Management**: Complete product lifecycle management
- **Inventory Control**: Real-time inventory tracking with batch support
- **Order Management**: Purchase and sales order processing
- **Supplier & Customer Management**: Complete vendor and customer lifecycle
- **Location Management**: Multi-location warehouse support
- **Audit Logging**: Complete inventory audit trail

## Project Structure

```
agromart2/
├── apps/server/
│   ├── cmd/api/           # Application entry point
│   ├── config/            # Configuration management
│   ├── handler/           # HTTP handlers
│   ├── inventory/         # Inventory service layer
│   ├── products/          # Product service layer
│   ├── services/          # Business services
│   ├── sql/
│   │   ├── queries/       # SQL query files
│   │   └── schema/        # Database migration files
│   └── pkg/               # Shared packages
├── db/                    # Generated sqlc code
├── internal/
│   ├── auth/              # Authentication & authorization
│   ├── database/          # Database utilities & services
│   └── utils/             # Utility functions
├── docker-compose.yml     # Development environment
└── sqlc.yaml             # sqlc configuration
```

## Quick Start

### Prerequisites

- Go 1.21+
- PostgreSQL 15+
- Docker & Docker Compose (for development)

### Development Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd agromart2
   ```

2. **Set up development environment**
   ```bash
   make dev-setup
   ```
   This will:
   - Install required development tools (sqlc, golang-migrate, golangci-lint)
   - Start PostgreSQL database in Docker
   - Set up the development environment

3. **Generate SQL code**
   ```bash
   make sqlc
   ```

4. **Run database migrations**
   ```bash
   make migrate-up
   ```

5. **Start the application**
   ```bash
   make run
   ```

The application will be available at `http://localhost:8080`.

## Database Design

### Core Entities

- **Tenants**: Multi-tenant isolation
- **Users**: User management with role-based access
- **Products**: Product catalog with units and pricing
- **Inventory**: Real-time inventory with batch tracking
- **Batches**: Product batch management with expiry dates
- **Suppliers/Customers**: Vendor and customer management
- **Purchase/Sales Orders**: Complete order lifecycle
- **Locations**: Multi-location warehouse support
- **Inventory Logs**: Audit trail for all inventory changes

### Key Features

- **Multi-tenant Architecture**: All entities are tenant-scoped
- **Batch Tracking**: Complete traceability with expiry dates
- **Audit Logging**: Full audit trail for inventory changes
- **Type Safety**: sqlc generates type-safe Go code from SQL
- **Connection Pooling**: Optimized PostgreSQL connection management

## Configuration

The application uses environment variables for configuration:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=password
DB_NAME=agromart

# Application
APP_PORT=8080
LOG_LEVEL=info
```

## Development

### Available Make Commands

```bash
make help              # Show all available commands
make build             # Build the application
make run               # Run the application
make test              # Run tests
make test-coverage     # Run tests with coverage
make sqlc              # Generate SQL code
make fmt               # Format code
make lint              # Lint code
make tidy              # Tidy go modules
make docker-db-up      # Start database
make docker-db-down    # Stop database
make migrate-up        # Run migrations up
make migrate-down      # Run migrations down
make migrate-create    # Create new migration
```

### Database Operations

#### Creating Migrations
```bash
make migrate-create NAME=add_new_table
```

#### Running Migrations
```bash
make migrate-up    # Apply all pending migrations
make migrate-down  # Rollback last migration
```

#### Generating SQL Code
After modifying SQL queries in `apps/server/sql/queries/`, run:
```bash
make sqlc
```

### Testing

```bash
# Run all tests
make test

# Run tests with coverage
make test-coverage
```

## Best Practices

### Database Access

1. **Use sqlc for all database operations** - Type-safe, performant SQL
2. **Transaction Management** - Use the database service for transactions
3. **Error Handling** - Proper PostgreSQL error handling with custom error types
4. **Connection Pooling** - Configured connection pool settings

### Code Organization

1. **Service Layer Pattern** - Business logic in service layers
2. **Repository Pattern** - Data access through repositories
3. **Dependency Injection** - Clean dependency management
4. **Error Wrapping** - Contextual error messages

### SQL Best Practices

1. **Named Parameters** - Use named parameters for clarity
2. **Prepared Statements** - sqlc generates prepared statements
3. **Index Usage** - Proper indexing for performance
4. **Query Optimization** - Efficient query patterns

## Performance Considerations

### Database
- Connection pooling configured for optimal performance
- Proper indexing on frequently queried columns
- Batch operations for bulk data processing
- Query optimization with EXPLAIN ANALYZE

### Application
- Structured logging for observability
- Graceful shutdown handling
- Context propagation for cancellation
- Memory-efficient data structures

## Security

- Multi-tenant data isolation
- SQL injection prevention via sqlc
- Prepared statements for all queries
- Secure connection configuration
- Environment-based configuration

## Deployment

### Docker
```bash
# Build image
docker build -t agromart .

# Run with Docker Compose
docker-compose up -d
```

### Environment Variables
Set the following environment variables for production:

```env
DB_HOST=your-db-host
DB_PORT=5432
DB_USER=your-db-user
DB_PASSWORD=your-db-password
DB_NAME=agromart
APP_PORT=8080
LOG_LEVEL=info
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes following the coding standards
4. Add tests for new functionality
5. Run `make test` and `make lint`
6. Submit a pull request

## Monitoring & Observability

- Structured logging with zerolog
- Database connection pool metrics
- Application health endpoints
- Request tracing capabilities
