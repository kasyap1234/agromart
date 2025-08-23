# API Changelog

This document tracks all changes to the AgroMart API, including new features, breaking changes, bug fixes, and deprecations.

## Version 1.0.0 (Current)

### Release Date: January 1, 2024

#### 🚀 New Features

- **Complete API Overhaul**: Migrated from Swagger 2.0 to OpenAPI 3.0 specification
- **Multi-tenant Architecture**: Full tenant isolation with JWT-based authentication
- **Comprehensive CRUD Operations**:
  - Products management with variants and units
  - Customer management with active/inactive status
  - Supplier management with payment terms
  - User management with role-based access control
- **File Upload System**:
  - Direct file uploads with metadata
  - Signed URL generation for large files
  - MinIO integration for scalable storage
  - Support for images, documents, and other file types
- **Order Management**:
  - Sales order creation and management
  - Purchase order processing
  - Order status tracking and updates
  - Item shipping and tracking
- **Analytics and Reporting**:
  - Real-time KPI metrics
  - Sales and purchase analytics
  - Inventory snapshots and projections
  - Low stock and expiry alerts
- **Advanced Features**:
  - Rate limiting and security headers
  - Request/response compression
  - Database connection pooling
  - Graceful shutdown handling

#### 📋 API Endpoints Added

**Authentication (6 endpoints)**
- `POST /auth/register` - User registration
- `POST /auth/login` - User authentication
- `POST /auth/logout` - Session termination
- `POST /auth/refresh` - Token refresh
- `GET /auth/me` - Current user info
- `PUT /password` - Password update

**Products (6 endpoints)**
- `GET /products` - List products with pagination
- `POST /products` - Create new product
- `GET /products/{id}` - Get product by ID
- `PATCH /products/{id}` - Update product
- `DELETE /products/{id}` - Delete product
- `GET /products/search` - Search products

**Customers (7 endpoints)**
- `GET /customers` - List customers
- `POST /customers` - Create customer
- `GET /customers/active` - List active customers
- `GET /customers/search` - Search customers
- `GET /customers/{id}` - Get customer by ID
- `PUT /customers/{id}` - Update customer
- `DELETE /customers/{id}` - Delete customer

**Suppliers (7 endpoints)**
- `GET /suppliers` - List suppliers
- `POST /suppliers` - Create supplier
- `GET /suppliers/search` - Search suppliers
- `GET /suppliers/{id}` - Get supplier by ID
- `PUT /suppliers/{id}` - Update supplier
- `DELETE /suppliers/{id}` - Delete supplier

**File Management (6 endpoints)**
- `POST /files/upload` - Direct file upload
- `GET /files` - List files
- `GET /files/{id}` - Get file info
- `DELETE /files/{id}` - Delete file
- `POST /files/signed-url` - Get signed upload URL
- `GET /files/{id}/url` - Get signed file URL

**Sales Orders (6 endpoints)**
- `GET /sales/orders` - List sales orders
- `POST /sales/orders` - Create sales order
- `GET /sales/orders/{id}` - Get sales order
- `PUT /sales/orders/{id}/status` - Update order status
- `POST /sales/orders/{id}/ship` - Ship order items
- `GET /sales/orders.csv` - Export orders to CSV

**Analytics & Reports (7 endpoints)**
- `GET /analytics/kpis` - Get KPI metrics
- `GET /analytics/sales` - Sales time series
- `GET /analytics/purchases` - Purchase time series
- `GET /analytics/inventory` - Inventory snapshot
- `GET /reports/dashboard-stats` - Dashboard statistics
- `GET /reports/low-stock` - Low stock report
- `GET /reports/expiring-batches` - Expiring batches report

**System (3 endpoints)**
- `GET /health` - Health check
- `GET /api/health` - API health check
- `GET /units` - List product units

#### 🔧 Technical Improvements

- **OpenAPI 3.0 Specification**: Complete migration with detailed schemas
- **Enhanced Security**:
  - JWT token-based authentication
  - Role-based access control (admin, manager, staff)
  - Input validation and sanitization
  - CORS configuration
  - Security headers
- **Performance Optimizations**:
  - Database connection pooling
  - Query optimization with SQLC
  - Response compression
  - Efficient pagination
- **Developer Experience**:
  - Comprehensive documentation
  - Code examples in multiple languages
  - Interactive API testing interface
  - Detailed error messages

#### 🐛 Bug Fixes

- Fixed database connection handling
- Resolved memory leaks in file uploads
- Fixed pagination edge cases
- Corrected timezone handling in reports

## Version 0.9.0 (Beta)

### Release Date: December 15, 2023

#### 🚀 New Features

- **Basic Authentication System**:
  - User registration and login
  - JWT token generation
  - Password reset functionality
- **Product Management**:
  - Basic CRUD operations
  - Product search
  - Category management
- **Initial API Structure**:
  - RESTful endpoint design
  - JSON response format
  - Error handling framework

#### 📋 API Endpoints Added

- Basic authentication endpoints
- Product CRUD operations
- Initial health check endpoint

## Migration Guide: 0.9.0 to 1.0.0

### Breaking Changes

#### Authentication Changes

1. **Token Format Change**
   ```javascript
   // Old format (v0.9.0)
   const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";

   // New format (v1.0.0)
   const response = await fetch('/auth/login', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ email, password })
   });
   const { token, refresh_token } = await response.json();
   ```

2. **Authorization Header**
   ```javascript
   // Old format
   headers: { 'Authorization': token }

   // New format
   headers: { 'Authorization': `Bearer ${token}` }
   ```

#### Response Format Changes

1. **Success Response Structure**
   ```javascript
   // Old format (v0.9.0)
   {
     "data": { ... }
   }

   // New format (v1.0.0)
   {
     "success": true,
     "data": { ... },
     "message": "Operation completed successfully"
   }
   ```

2. **Error Response Structure**
   ```javascript
   // Old format (v0.9.0)
   {
     "error": "Error message"
   }

   // New format (v1.0.0)
   {
     "success": false,
     "error": {
       "code": "VALIDATION_ERROR",
       "message": "Validation failed",
       "details": { ... }
     }
   }
   ```

#### Product API Changes

1. **Required Fields**
   ```javascript
   // Old format (v0.9.0)
   {
     "name": "Product Name",
     "price": 100
   }

   // New format (v1.0.0)
   {
     "name": "Product Name",
     "sku": "PROD-001",
     "price": 100
   }
   ```

2. **Price Format**
   ```javascript
   // Old format (v0.9.0)
   {
     "price": 10.50
   }

   // New format (v1.0.0) - Price in cents
   {
     "price": 1050
   }
   ```

### New Features to Implement

1. **Pagination Changes**
   ```javascript
   // Old format
   GET /products?page=1

   // New format
   GET /products?page=1&limit=20
   ```

2. **Search Endpoint Changes**
   ```javascript
   // Old format
   GET /products?search=query

   // New format
   GET /products/search?q=query&page=1&limit=20
   ```

### Database Migration Required

1. **Schema Updates**
   - Add `tenant_id` to all tables
   - Add `created_at` and `updated_at` timestamps
   - Add `is_active` flags where needed
   - Update price fields to integer (cents)

2. **Data Migration**
   - Convert existing users to tenant structure
   - Update price values to cents
   - Add missing required fields

## Future Roadmap

### Version 1.1.0 (Planned Q1 2024)

- **Webhooks System**: Real-time notifications
- **Advanced Analytics**: Custom report builder
- **Mobile API**: Optimized endpoints for mobile apps
- **Bulk Operations**: Batch import/export functionality

### Version 1.2.0 (Planned Q2 2024)

- **API Gateway**: Enhanced security and routing
- **GraphQL Support**: Alternative query interface
- **Advanced Caching**: Redis integration
- **Audit Logging**: Complete request/response logging

### Version 2.0.0 (Planned Q3 2024)

- **Microservices Architecture**: Service decomposition
- **Advanced Authentication**: OAuth2, SAML support
- **Real-time Features**: WebSocket integration
- **AI/ML Integration**: Predictive analytics

## Support and Migration Assistance

For migration assistance or questions about API changes:

- **Documentation**: [docs.agromart.com](https://docs.agromart.com)
- **Support Email**: support@agromart.com
- **Community Forum**: [forum.agromart.com](https://forum.agromart.com)
- **Migration Guide**: [docs.agromart.com/migration](https://docs.agromart.com/migration)

## Deprecated Endpoints

The following endpoints are deprecated and will be removed in version 1.1.0:

| Deprecated Endpoint | Replacement | Removal Date |
|-------------------|-------------|--------------|
| `GET /v1/products` | `GET /products` | March 1, 2024 |
| `POST /auth/token` | `POST /auth/refresh` | March 1, 2024 |
| `GET /inventory/low` | `GET /reports/low-stock` | April 1, 2024 |

## Security Advisories

### January 1, 2024 - Rate Limiting Implementation
- **Issue**: No rate limiting on API endpoints
- **Fix**: Implemented comprehensive rate limiting
- **Impact**: Improved API security and stability
- **Action Required**: Update client applications to handle 429 responses

### December 15, 2023 - JWT Security Enhancement
- **Issue**: Simplified token structure
- **Fix**: Enhanced JWT with tenant context and role information
- **Impact**: Better security and tenant isolation
- **Action Required**: Update authentication handling in client applications

## Contributing to API Changes

To propose API changes or report issues:

1. **Feature Requests**: Use the [feature request template](https://github.com/agromart/api/issues/new?template=feature_request.md)
2. **Bug Reports**: Use the [bug report template](https://github.com/agromart/api/issues/new?template=bug_report.md)
3. **API Changes**: Follow the [API change proposal process](https://docs.agromart.com/contributing/api-changes)

## License

This API changelog is licensed under the MIT License. See [LICENSE](LICENSE) for details.