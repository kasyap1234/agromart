# AgroMart API Documentation

## Overview

The AgroMart API is a comprehensive REST API for agricultural product inventory management. It provides complete functionality for managing products, suppliers, customers, sales orders, purchase orders, inventory tracking, analytics, and file management.

## Base URL

- **Development**: `http://localhost:8080/api`
- **Production**: `https://api.agromart.com/api`

## Authentication

All protected endpoints require JWT (JSON Web Token) authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### Authentication Flow

1. **Register** a new user and tenant:
```bash
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "company": "My Farm Co",
    "email": "admin@myfarm.com",
    "name": "John Farmer",
    "password": "securepassword123",
    "phone": "+1234567890"
  }'
```

2. **Login** to get access and refresh tokens:
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@myfarm.com",
    "password": "securepassword123"
  }'
```

3. **Use the access token** for authenticated requests:
```bash
curl -X GET http://localhost:8080/api/auth/me \
  -H "Authorization: Bearer <access_token>"
```

## Rate Limiting

The API implements rate limiting to protect against abuse:

- **Authenticated requests**: 1000 requests per hour
- **File uploads**: 50 uploads per hour
- **Search endpoints**: 100 requests per minute

Rate limit headers are included in responses:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Time until limit resets

## Response Format

All API responses follow a consistent format:

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully"
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": { ... }
  }
}
```

### List Response with Pagination
```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8,
    "has_more": true
  }
}
```

## Common HTTP Status Codes

- `200` - OK: Request successful
- `201` - Created: Resource created successfully
- `400` - Bad Request: Invalid request data
- `401` - Unauthorized: Authentication required
- `403` - Forbidden: Insufficient permissions
- `404` - Not Found: Resource not found
- `409` - Conflict: Resource already exists
- `413` - Payload Too Large: File too large
- `429` - Too Many Requests: Rate limit exceeded
- `500` - Internal Server Error: Server error

## API Endpoints

### Authentication

#### Register
```bash
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "company": "My Farm Co",
    "email": "admin@myfarm.com",
    "name": "John Farmer",
    "password": "securepassword123",
    "phone": "+1234567890"
  }'
```

#### Login
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@myfarm.com",
    "password": "securepassword123"
  }'
```

#### Get Current User
```bash
curl -X GET http://localhost:8080/api/auth/me \
  -H "Authorization: Bearer <token>"
```

#### Refresh Token
```bash
curl -X POST http://localhost:8080/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refresh_token": "<refresh_token>"
  }'
```

### Products

#### List Products
```bash
curl -X GET "http://localhost:8080/api/products?page=1&limit=20" \
  -H "Authorization: Bearer <token>"
```

#### Create Product
```bash
curl -X POST http://localhost:8080/api/products \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Organic Tomatoes",
    "sku": "TOM-ORG-001",
    "price": 350,
    "price_per_unit": 35,
    "unit_id": "550e8400-e29b-41d4-a716-446655440001",
    "description": "Fresh organic tomatoes",
    "brand": "Farm Fresh",
    "gst_percent": 5,
    "image_url": "https://example.com/tomatoes.jpg"
  }'
```

#### Search Products
```bash
curl -X GET "http://localhost:8080/api/products/search?q=tomato&page=1&limit=10" \
  -H "Authorization: Bearer <token>"
```

#### Get Product
```bash
curl -X GET http://localhost:8080/api/products/550e8400-e29b-41d4-a716-446655440001 \
  -H "Authorization: Bearer <token>"
```

#### Update Product
```bash
curl -X PATCH http://localhost:8080/api/products/550e8400-e29b-41d4-a716-446655440001 \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Product Name",
    "price": 400,
    "description": "Updated description"
  }'
```

#### Delete Product
```bash
curl -X DELETE http://localhost:8080/api/products/550e8400-e29b-41d4-a716-446655440001 \
  -H "Authorization: Bearer <token>"
```

### Customers

#### List Customers
```bash
curl -X GET "http://localhost:8080/api/customers?page=1&limit=20" \
  -H "Authorization: Bearer <token>"
```

#### Create Customer
```bash
curl -X POST http://localhost:8080/api/customers \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Green Valley Market",
    "contact_person": "Sarah Johnson",
    "email": "sarah@greenvalley.com",
    "phone": "+1234567890",
    "address": "123 Market Street, Farmville",
    "payment_mode": "credit"
  }'
```

#### Search Customers
```bash
curl -X GET "http://localhost:8080/api/customers/search?q=green&page=1&limit=10" \
  -H "Authorization: Bearer <token>"
```

### Suppliers

#### List Suppliers
```bash
curl -X GET "http://localhost:8080/api/suppliers?page=1&limit=20&active=true" \
  -H "Authorization: Bearer <token>"
```

#### Create Supplier
```bash
curl -X POST http://localhost:8080/api/suppliers \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Fresh Produce Co",
    "contact_person": "Mike Smith",
    "email": "mike@freshproduce.com",
    "phone": "+1234567890",
    "address": "456 Supply Road, Agriculture City",
    "payment_mode": "net30",
    "tax_id": "TX123456789"
  }'
```

### File Upload

#### Upload File
```bash
curl -X POST http://localhost:8080/api/files/upload \
  -H "Authorization: Bearer <token>" \
  -F "file=@/path/to/image.jpg" \
  -F "entity_type=product" \
  -F "entity_id=550e8400-e29b-41d4-a716-446655440001" \
  -F "file_type=image"
```

#### Get Signed Upload URL
```bash
curl -X POST http://localhost:8080/api/files/signed-url \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "file_name": "product-image.jpg",
    "content_type": "image/jpeg",
    "entity_type": "product",
    "entity_id": "550e8400-e29b-41d4-a716-446655440001",
    "file_type": "image"
  }'
```

#### Get File Info
```bash
curl -X GET http://localhost:8080/api/files/550e8400-e29b-41d4-a716-446655440008?expiry=2h \
  -H "Authorization: Bearer <token>"
```

## JavaScript Examples

### Login and Get Data
```javascript
// Login
const loginResponse = await fetch('http://localhost:8080/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'admin@myfarm.com',
    password: 'securepassword123'
  })
});

const { data } = await loginResponse.json();
const token = data.token;

// Get products
const productsResponse = await fetch('http://localhost:8080/api/products', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const products = await productsResponse.json();
console.log(products);
```

### Upload File
```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('entity_type', 'product');
formData.append('entity_id', '550e8400-e29b-41d4-a716-446655440001');

const response = await fetch('http://localhost:8080/api/files/upload', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});

const result = await response.json();
console.log('File uploaded:', result.data);
```

## Python Examples

### Using requests library
```python
import requests
import json

# Login
login_data = {
    'email': 'admin@myfarm.com',
    'password': 'securepassword123'
}

login_response = requests.post(
    'http://localhost:8080/api/auth/login',
    json=login_data
)

token = login_response.json()['data']['token']
headers = {'Authorization': f'Bearer {token}'}

# Get products
products_response = requests.get(
    'http://localhost:8080/api/products',
    headers=headers
)

products = products_response.json()
print(products)

# Create product
product_data = {
    'name': 'Organic Carrots',
    'sku': 'CAR-ORG-001',
    'price': 250,
    'description': 'Fresh organic carrots'
}

create_response = requests.post(
    'http://localhost:8080/api/products',
    json=product_data,
    headers=headers
)

print(create_response.json())
```

### File Upload
```python
import requests

files = {
    'file': open('image.jpg', 'rb')
}

data = {
    'entity_type': 'product',
    'entity_id': '550e8400-e29b-41d4-a716-446655440001',
    'file_type': 'image'
}

response = requests.post(
    'http://localhost:8080/api/files/upload',
    files=files,
    data=data,
    headers={'Authorization': f'Bearer {token}'}
)

print(response.json())
```

## Go Examples

### Client Implementation
```go
package main

import (
    "bytes"
    "encoding/json"
    "fmt"
    "io"
    "mime/multipart"
    "net/http"
    "os"
)

type LoginRequest struct {
    Email    string `json:"email"`
    Password string `json:"password"`
}

type AuthResponse struct {
    Success bool `json:"success"`
    Data    struct {
        Token string `json:"token"`
    } `json:"data"`
}

type Product struct {
    Name        string `json:"name"`
    SKU         string `json:"sku"`
    Price       int    `json:"price"`
    Description string `json:"description"`
}

func main() {
    // Login
    loginReq := LoginRequest{
        Email:    "admin@myfarm.com",
        Password: "securepassword123",
    }

    loginJSON, _ := json.Marshal(loginReq)
    resp, err := http.Post(
        "http://localhost:8080/api/auth/login",
        "application/json",
        bytes.NewBuffer(loginJSON),
    )
    if err != nil {
        panic(err)
    }

    var authResp AuthResponse
    json.NewDecoder(resp.Body).Decode(&authResp)
    token := authResp.Data.Token

    // Get products
    client := &http.Client{}
    req, _ := http.NewRequest("GET", "http://localhost:8080/api/products", nil)
    req.Header.Set("Authorization", "Bearer "+token)

    productsResp, err := client.Do(req)
    if err != nil {
        panic(err)
    }

    body, _ := io.ReadAll(productsResp.Body)
    fmt.Println(string(body))
}
```

### File Upload
```go
func uploadFile(token, filePath string) error {
    file, err := os.Open(filePath)
    if err != nil {
        return err
    }
    defer file.Close()

    var b bytes.Buffer
    writer := multipart.NewWriter(&b)

    // Add file
    fw, err := writer.CreateFormFile("file", filePath)
    if err != nil {
        return err
    }
    io.Copy(fw, file)

    // Add form fields
    writer.WriteField("entity_type", "product")
    writer.WriteField("entity_id", "550e8400-e29b-41d4-a716-446655440001")
    writer.WriteField("file_type", "image")

    writer.Close()

    req, err := http.NewRequest("POST", "http://localhost:8080/api/files/upload", &b)
    if err != nil {
        return err
    }

    req.Header.Set("Authorization", "Bearer "+token)
    req.Header.Set("Content-Type", writer.FormDataContentType())

    client := &http.Client{}
    resp, err := client.Do(req)
    if err != nil {
        return err
    }
    defer resp.Body.Close()

    body, _ := io.ReadAll(resp.Body)
    fmt.Println(string(body))

    return nil
}
```

## Error Codes

| Code | Description |
|------|-------------|
| `VALIDATION_ERROR` | Invalid request data or missing required fields |
| `AUTHENTICATION_ERROR` | Invalid or missing authentication |
| `AUTHORIZATION_ERROR` | Insufficient permissions for the operation |
| `NOT_FOUND` | Requested resource not found |
| `CONFLICT` | Resource already exists |
| `RATE_LIMIT_EXCEEDED` | Too many requests |
| `INTERNAL_ERROR` | Internal server error |

## Webhooks and Events

The API supports webhooks for real-time notifications. Configure webhooks in your tenant settings to receive notifications for:

- New orders
- Inventory changes
- Product updates
- Customer activities

## SDKs and Libraries

- **JavaScript/Node.js**: [agromart-js-sdk](https://github.com/agromart/js-sdk)
- **Python**: [agromart-python](https://github.com/agromart/python-client)
- **Go**: [agromart-go](https://github.com/agromart/go-client)

## Support

- **Documentation**: [docs.agromart.com](https://docs.agromart.com)
- **API Reference**: [api.agromart.com/docs](https://api.agromart.com/docs)
- **Support Email**: support@agromart.com
- **Community Forum**: [forum.agromart.com](https://forum.agromart.com)

## Changelog

### Version 1.0.0
- Initial release
- Complete CRUD operations for products, customers, suppliers
- File upload system with MinIO integration
- JWT authentication with role-based access control
- Analytics and reporting endpoints
- Purchase and sales order management
- Inventory tracking and batch management

## License

This API documentation is licensed under the MIT License. See [LICENSE](LICENSE) for details.