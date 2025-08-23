# API Testing Guide

This guide provides comprehensive instructions for testing the AgroMart API endpoints, including authentication, CRUD operations, file uploads, and advanced workflows.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Authentication Testing](#authentication-testing)
3. [Endpoint Testing](#endpoint-testing)
4. [File Upload Testing](#file-upload-testing)
5. [Error Scenario Testing](#error-scenario-testing)
6. [Performance Testing](#performance-testing)
7. [Integration Testing](#integration-testing)
8. [Automated Testing](#automated-testing)

## Prerequisites

### Required Tools

```bash
# Install HTTP testing tools
brew install httpie    # Alternative to curl
npm install -g newman  # Postman command line runner

# Install testing frameworks
go get github.com/stretchr/testify
pip install requests pytest
npm install axios jest
```

### Environment Setup

1. **Start the server**:
```bash
cd apps/server
go run main.go
```

2. **Verify server is running**:
```bash
curl http://localhost:8080/api/health
```

3. **Set environment variables**:
```bash
export API_BASE_URL=http://localhost:8080/api
export TEST_EMAIL=admin@myfarm.com
export TEST_PASSWORD=password123
```

## Authentication Testing

### Complete Authentication Flow

```bash
#!/bin/bash
# auth_test.sh

echo "=== Authentication Testing ==="

# 1. Test registration
echo "1. Testing registration..."
curl -X POST $API_BASE_URL/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "company": "Test Company",
    "email": "test@example.com",
    "name": "Test User",
    "password": "testpass123",
    "phone": "+1234567890"
  }'

# 2. Test login
echo -e "\n2. Testing login..."
LOGIN_RESPONSE=$(curl -s -X POST $API_BASE_URL/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpass123"
  }')

echo $LOGIN_RESPONSE

# Extract token
TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)
echo "Token: $TOKEN"

# 3. Test token validation
echo -e "\n3. Testing token validation..."
curl -X GET $API_BASE_URL/auth/me \
  -H "Authorization: Bearer $TOKEN"

# 4. Test token refresh
echo -e "\n4. Testing token refresh..."
REFRESH_TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"refresh_token":"[^"]*' | cut -d'"' -f4)
curl -X POST $API_BASE_URL/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{\"refresh_token\": \"$REFRESH_TOKEN\"}"
```

### JavaScript Authentication Test

```javascript
// auth.test.js
const axios = require('axios');

const API_BASE = 'http://localhost:8080/api';

describe('Authentication Tests', () => {
    let token;
    let refreshToken;

    test('should register new user', async () => {
        const response = await axios.post(`${API_BASE}/auth/register`, {
            company: 'Test Company',
            email: `test${Date.now()}@example.com`,
            name: 'Test User',
            password: 'testpass123',
            phone: '+1234567890'
        });

        expect(response.data.success).toBe(true);
        expect(response.data.data.user).toBeDefined();
        expect(response.data.data.token).toBeDefined();
    });

    test('should login user', async () => {
        const response = await axios.post(`${API_BASE}/auth/login`, {
            email: 'test@example.com',
            password: 'testpass123'
        });

        expect(response.data.success).toBe(true);
        expect(response.data.data.token).toBeDefined();
        expect(response.data.data.refresh_token).toBeDefined();

        token = response.data.data.token;
        refreshToken = response.data.data.refresh_token;
    });

    test('should get current user', async () => {
        const response = await axios.get(`${API_BASE}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        expect(response.data.success).toBe(true);
        expect(response.data.data.name).toBe('Test User');
    });

    test('should refresh token', async () => {
        const response = await axios.post(`${API_BASE}/auth/refresh`, {
            refresh_token: refreshToken
        });

        expect(response.data.success).toBe(true);
        expect(response.data.data.token).toBeDefined();
        expect(response.data.data.refresh_token).toBeDefined();
    });

    test('should fail with invalid credentials', async () => {
        try {
            await axios.post(`${API_BASE}/auth/login`, {
                email: 'invalid@example.com',
                password: 'wrongpassword'
            });
        } catch (error) {
            expect(error.response.status).toBe(401);
            expect(error.response.data.success).toBe(false);
        }
    });
});
```

## Endpoint Testing

### Product CRUD Operations

```bash
#!/bin/bash
# product_test.sh

echo "=== Product CRUD Testing ==="

# Get token first
LOGIN_RESPONSE=$(curl -s -X POST $API_BASE_URL/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpass123"
  }')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

# 1. Create product
echo "1. Creating product..."
CREATE_RESPONSE=$(curl -s -X POST $API_BASE_URL/products \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Tomato",
    "sku": "TOM-TEST-001",
    "price": 250,
    "description": "Test organic tomato",
    "brand": "Test Brand"
  }')

echo $CREATE_RESPONSE

# Extract product ID
PRODUCT_ID=$(echo $CREATE_RESPONSE | grep -o '"id":"[^"]*' | cut -d'"' -f4)
echo "Product ID: $PRODUCT_ID"

# 2. List products
echo -e "\n2. Listing products..."
curl -X GET "$API_BASE_URL/products?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN"

# 3. Get specific product
echo -e "\n3. Getting specific product..."
curl -X GET "$API_BASE_URL/products/$PRODUCT_ID" \
  -H "Authorization: Bearer $TOKEN"

# 4. Update product
echo -e "\n4. Updating product..."
curl -X PATCH "$API_BASE_URL/products/$PRODUCT_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Test Tomato",
    "price": 300,
    "description": "Updated test organic tomato"
  }'

# 5. Search products
echo -e "\n5. Searching products..."
curl -X GET "$API_BASE_URL/products/search?q=tomato&page=1&limit=5" \
  -H "Authorization: Bearer $TOKEN"

# 6. Delete product
echo -e "\n6. Deleting product..."
curl -X DELETE "$API_BASE_URL/products/$PRODUCT_ID" \
  -H "Authorization: Bearer $TOKEN"
```

### Python Product Testing

```python
# product_test.py
import requests
import json
from typing import Dict, Any

class ProductAPITester:
    def __init__(self, base_url: str, token: str):
        self.base_url = base_url
        self.headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }

    def test_product_crud(self):
        """Test complete product CRUD operations"""
        print("=== Product CRUD Testing ===")

        # Create product
        product_data = {
            'name': 'Test Carrot',
            'sku': 'CAR-TEST-001',
            'price': 150,
            'description': 'Test organic carrot',
            'brand': 'Test Brand'
        }

        print("1. Creating product...")
        response = requests.post(
            f'{self.base_url}/products',
            json=product_data,
            headers=self.headers
        )
        print(f"Status: {response.status_code}")
        print(f"Response: {response.json()}")

        if response.status_code == 201:
            product_id = response.json()['data']['id']

            # Update product
            print("\n2. Updating product...")
            update_data = {
                'name': 'Updated Test Carrot',
                'price': 180
            }
            response = requests.patch(
                f'{self.base_url}/products/{product_id}',
                json=update_data,
                headers=self.headers
            )
            print(f"Status: {response.status_code}")
            print(f"Response: {response.json()}")

            # Get product
            print("\n3. Getting product...")
            response = requests.get(
                f'{self.base_url}/products/{product_id}',
                headers=self.headers
            )
            print(f"Status: {response.status_code}")
            print(f"Response: {response.json()}")

            return product_id
        return None

    def test_product_search(self):
        """Test product search functionality"""
        print("\n=== Product Search Testing ===")

        # Search products
        response = requests.get(
            f'{self.base_url}/products/search?q=test&page=1&limit=10',
            headers=self.headers
        )
        print(f"Search Status: {response.status_code}")
        print(f"Search Results: {response.json()}")

    def test_product_listing(self):
        """Test product listing with pagination"""
        print("\n=== Product Listing Testing ===")

        # Test different page sizes
        for limit in [5, 10, 20]:
            response = requests.get(
                f'{self.base_url}/products?page=1&limit={limit}',
                headers=self.headers
            )
            print(f"Limit {limit} - Status: {response.status_code}")
            if response.status_code == 200:
                data = response.json()['data']
                pagination = response.json()['pagination']
                print(f"  Returned {len(data)} items")
                print(f"  Pagination: {pagination}")

    def test_bulk_operations(self, product_ids: list):
        """Test bulk operations on multiple products"""
        print("\n=== Bulk Operations Testing ===")

        successful = 0
        failed = 0

        for product_id in product_ids:
            # Update price for each product
            update_data = {'price': 200}

            response = requests.patch(
                f'{self.base_url}/products/{product_id}',
                json=update_data,
                headers=self.headers
            )

            if response.status_code == 200:
                successful += 1
            else:
                failed += 1

        print(f"Bulk update results: {successful} successful, {failed} failed")
```

## File Upload Testing

### File Upload Test Script

```bash
#!/bin/bash
# file_upload_test.sh

echo "=== File Upload Testing ==="

# Get authentication token
LOGIN_RESPONSE=$(curl -s -X POST $API_BASE_URL/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpass123"
  }')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

# Create a test file
echo "Creating test file..."
echo "This is a test file for upload testing" > test_upload.txt

# 1. Direct file upload
echo "1. Testing direct file upload..."
UPLOAD_RESPONSE=$(curl -s -X POST $API_BASE_URL/files/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test_upload.txt" \
  -F "entity_type=product" \
  -F "entity_id=550e8400-e29b-41d4-a716-446655440001" \
  -F "file_type=document")

echo $UPLOAD_RESPONSE

# Extract file ID
FILE_ID=$(echo $UPLOAD_RESPONSE | grep -o '"file_id":"[^"]*' | cut -d'"' -f4)
echo "File ID: $FILE_ID"

# 2. Get signed upload URL
echo -e "\n2. Testing signed upload URL..."
SIGNED_URL_RESPONSE=$(curl -s -X POST $API_BASE_URL/files/signed-url \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "file_name": "test_image.jpg",
    "content_type": "image/jpeg",
    "entity_type": "product",
    "entity_id": "550e8400-e29b-41d4-a716-446655440001",
    "file_type": "image"
  }')

echo $SIGNED_URL_RESPONSE

# 3. Get file info
echo -e "\n3. Testing file info retrieval..."
curl -X GET "$API_BASE_URL/files/$FILE_ID?expiry=2h" \
  -H "Authorization: Bearer $TOKEN"

# 4. List files
echo -e "\n4. Testing file listing..."
curl -X GET "$API_BASE_URL/files?entity_type=product&page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN"

# Cleanup
rm test_upload.txt
```

### JavaScript File Upload Testing

```javascript
// file_upload.test.js
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

class FileUploadTester {
    constructor(baseURL, token) {
        this.baseURL = baseURL;
        this.token = token;
        this.headers = {
            'Authorization': `Bearer ${token}`
        };
    }

    async testDirectUpload() {
        console.log('=== Testing Direct File Upload ===');

        // Create test file
        const testContent = 'This is test file content for upload testing.';
        fs.writeFileSync('test_upload.txt', testContent);

        // Create form data
        const formData = new FormData();
        formData.append('file', fs.createReadStream('test_upload.txt'));
        formData.append('entity_type', 'product');
        formData.append('entity_id', '550e8400-e29b-41d4-a716-446655440001');
        formData.append('file_type', 'document');

        try {
            const response = await axios.post(
                `${this.baseURL}/files/upload`,
                formData,
                {
                    headers: {
                        ...this.headers,
                        ...formData.getHeaders()
                    }
                }
            );

            console.log('Upload successful:', response.data);

            // Cleanup
            fs.unlinkSync('test_upload.txt');

            return response.data.data;
        } catch (error) {
            console.error('Upload failed:', error.response?.data || error.message);
            throw error;
        }
    }

    async testSignedUploadURL() {
        console.log('=== Testing Signed Upload URL ===');

        const requestData = {
            file_name: 'test_image.jpg',
            content_type: 'image/jpeg',
            entity_type: 'product',
            entity_id: '550e8400-e29b-41d4-a716-446655440001',
            file_type: 'image'
        };

        try {
            const response = await axios.post(
                `${this.baseURL}/files/signed-url`,
                requestData,
                { headers: this.headers }
            );

            console.log('Signed URL obtained:', response.data);
            return response.data.data;
        } catch (error) {
            console.error('Signed URL request failed:', error.response?.data || error.message);
            throw error;
        }
    }

    async testFileRetrieval(fileId) {
        console.log('=== Testing File Retrieval ===');

        try {
            const response = await axios.get(
                `${this.baseURL}/files/${fileId}?expiry=1h`,
                { headers: this.headers }
            );

            console.log('File info retrieved:', response.data);
            return response.data.data;
        } catch (error) {
            console.error('File retrieval failed:', error.response?.data || error.message);
            throw error;
        }
    }

    async testFileDeletion(fileId) {
        console.log('=== Testing File Deletion ===');

        try {
            const response = await axios.delete(
                `${this.baseURL}/files/${fileId}`,
                { headers: this.headers }
            );

            console.log('File deleted:', response.data);
            return response.data;
        } catch (error) {
            console.error('File deletion failed:', error.response?.data || error.message);
            throw error;
        }
    }

    async runAllTests() {
        try {
            // Test direct upload
            const uploadResult = await this.testDirectUpload();
            const fileId = uploadResult.file_id;

            // Test file retrieval
            await this.testFileRetrieval(fileId);

            // Test signed URL
            await this.testSignedUploadURL();

            // Test file deletion
            await this.testFileDeletion(fileId);

            console.log('All file upload tests completed successfully!');
        } catch (error) {
            console.error('File upload tests failed:', error);
        }
    }
}

// Usage
const tester = new FileUploadTester('http://localhost:8080/api', token);
tester.runAllTests();
```

## Error Scenario Testing

### Error Testing Script

```bash
#!/bin/bash
# error_testing.sh

echo "=== Error Scenario Testing ==="

# Get valid token
LOGIN_RESPONSE=$(curl -s -X POST $API_BASE_URL/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpass123"
  }')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

echo "1. Testing invalid authentication..."
curl -X GET $API_BASE_URL/products \
  -H "Authorization: Bearer invalid_token"

echo -e "\n2. Testing missing authentication..."
curl -X GET $API_BASE_URL/products

echo -e "\n3. Testing invalid product ID..."
curl -X GET $API_BASE_URL/products/invalid-uuid \
  -H "Authorization: Bearer $TOKEN"

echo -e "\n4. Testing validation error..."
curl -X POST $API_BASE_URL/products \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "", "price": -10}'

echo -e "\n5. Testing insufficient permissions..."
# Try to create product without proper role
curl -X POST $API_BASE_URL/products \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Unauthorized Product",
    "sku": "UNAUTH-001",
    "price": 100
  }'

echo -e "\n6. Testing file upload validation..."
curl -X POST $API_BASE_URL/files/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@nonexistent_file.txt"

echo -e "\n7. Testing rate limiting..."
# Make multiple rapid requests
for i in {1..15}; do
  curl -s -X GET $API_BASE_URL/products \
    -H "Authorization: Bearer $TOKEN" > /dev/null &
done
wait
echo "Rate limiting test completed"
```

## Performance Testing

### Load Testing with Apache Bench

```bash
#!/bin/bash
# performance_test.sh

echo "=== Performance Testing ==="

# 1. Health check performance
echo "1. Health check performance..."
ab -n 1000 -c 10 http://localhost:8080/api/health

# 2. Authentication performance
echo -e "\n2. Authentication performance..."
ab -n 500 -c 5 -p login_data.json -T application/json \
  -H "Content-Type: application/json" \
  http://localhost:8080/api/auth/login

# 3. Product listing performance
echo -e "\n3. Product listing performance..."
ab -n 1000 -c 20 -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/products

# 4. File upload performance
echo -e "\n4. File upload performance..."
ab -n 100 -c 5 -p upload_data.txt -T multipart/form-data \
  -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/files/upload
```

### JMeter Test Plan

```xml
<!-- basic_load_test.jmx -->
<?xml version="1.0" encoding="UTF-8"?>
<jmeterTestPlan version="1.2" properties="5.0" jmeter="5.4.1">
  <hashTree>
    <TestPlan guiclass="TestPlanGui" testclass="TestPlan" testname="AgroMart Load Test">
      <elementProp name="TestPlan.user_defined_variables" elementType="Arguments" guiclass="ArgumentsPanel" testclass="Arguments" testname="User Defined Variables">
        <collectionProp name="Arguments.arguments">
          <elementProp name="BASE_URL" elementType="Argument">
            <stringProp name="Argument.name">BASE_URL</stringProp>
            <stringProp name="Argument.value">http://localhost:8080/api</stringProp>
          </elementProp>
        </collectionProp>
      </elementProp>
    </TestPlan>
    <hashTree>
      <ThreadGroup guiclass="ThreadGroupGui" testclass="ThreadGroup" testname="API Load Test">
        <intProp name="ThreadGroup.on_sample_error">1</intProp>
        <elementProp name="ThreadGroup.main_controller" elementType="LoopController" guiclass="LoopControllerGui" testclass="LoopController" testname="Loop Controller">
          <stringProp name="LoopController.loops">10</stringProp>
        </elementProp>
        <stringProp name="ThreadGroup.num_threads">20</stringProp>
        <stringProp name="ThreadGroup.ramp_time">30</stringProp>
      </ThreadGroup>
      <hashTree>
        <!-- Login Request -->
        <HTTPSamplerProxy guiclass="HttpTestSampleGui" testclass="HTTPSamplerProxy" testname="Login Request">
          <stringProp name="HTTPSampler.domain">${BASE_URL}</stringProp>
          <stringProp name="HTTPSampler.path">/auth/login</stringProp>
          <stringProp name="HTTPSampler.method">POST</stringProp>
          <boolProp name="HTTPSampler.follow_redirects">true</boolProp>
          <stringProp name="HTTPSampler.postBodyRaw">true</stringProp>
          <elementProp name="HTTPsampler.Arguments" elementType="Arguments">
            <collectionProp name="Arguments.arguments">
              <elementProp name="login_data" elementType="HTTPArgument">
                <boolProp name="HTTPArgument.always_encode">false</boolProp>
                <stringProp name="Argument.value">{"email":"test@example.com","password":"testpass123"}</stringProp>
                <stringProp name="Argument.metadata">=</stringProp>
              </elementProp>
            </collectionProp>
          </elementProp>
        </HTTPSamplerProxy>
        <hashTree/>

        <!-- Product List Request -->
        <HTTPSamplerProxy guiclass="HttpTestSampleGui" testclass="HTTPSamplerProxy" testname="Product List">
          <stringProp name="HTTPSampler.domain">${BASE_URL}</stringProp>
          <stringProp name="HTTPSampler.path">/products</stringProp>
          <stringProp name="HTTPSampler.method">GET</stringProp>
          <elementProp name="HTTPsampler.Arguments" elementType="Arguments">
            <collectionProp name="Arguments.arguments">
              <elementProp name="page" elementType="HTTPArgument">
                <boolProp name="HTTPArgument.always_encode">false</boolProp>
                <stringProp name="Argument.value">1</stringProp>
                <stringProp name="Argument.metadata">=</stringProp>
              </elementProp>
              <elementProp name="limit" elementType="HTTPArgument">
                <boolProp name="HTTPArgument.always_encode">false</boolProp>
                <stringProp name="Argument.value">20</stringProp>
                <stringProp name="Argument.metadata">=</stringProp>
              </elementProp>
            </collectionProp>
          </elementProp>
        </HTTPSamplerProxy>
        <hashTree/>
      </hashTree>
    </hashTree>
  </hashTree>
</jmeterTestPlan>
```

## Integration Testing

### End-to-End Workflow Testing

```javascript
// e2e.test.js
const axios = require('axios');

const API_BASE = 'http://localhost:8080/api';

describe('End-to-End Workflow Tests', () => {
    let token;
    let customerId;
    let productId;
    let orderId;

    beforeAll(async () => {
        // Login
        const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
            email: 'test@example.com',
            password: 'testpass123'
        });
        token = loginResponse.data.data.token;
    });

    test('complete product lifecycle', async () => {
        // Create product
        const productResponse = await axios.post(`${API_BASE}/products`, {
            name: 'E2E Test Product',
            sku: 'E2E-TEST-001',
            price: 100,
            description: 'Product for E2E testing'
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });

        expect(productResponse.data.success).toBe(true);
        productId = productResponse.data.data.id;

        // Update product
        const updateResponse = await axios.patch(
            `${API_BASE}/products/${productId}`,
            { price: 150 },
            { headers: { Authorization: `Bearer ${token}` } }
        );

        expect(updateResponse.data.success).toBe(true);

        // Get product
        const getResponse = await axios.get(
            `${API_BASE}/products/${productId}`,
            { headers: { Authorization: `Bearer ${token}` } }
        );

        expect(getResponse.data.data.price).toBe(150);
    });

    test('complete customer and order workflow', async () => {
        // Create customer
        const customerResponse = await axios.post(`${API_BASE}/customers`, {
            name: 'E2E Test Customer',
            contact_person: 'Test Person',
            email: 'e2e@test.com',
            phone: '+1234567890',
            address: '123 Test Street'
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });

        expect(customerResponse.data.success).toBe(true);
        customerId = customerResponse.data.data.id;

        // Create sales order
        const orderResponse = await axios.post(`${API_BASE}/sales/orders`, {
            customer_id: customerId,
            items: [{
                product_id: productId,
                quantity_ordered: 5,
                unit_price: 150
            }]
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });

        expect(orderResponse.data.success).toBe(true);
        orderId = orderResponse.data.data.id;

        // Update order status
        const statusResponse = await axios.put(
            `${API_BASE}/sales/orders/${orderId}/status`,
            { status: 'APPROVED' },
            { headers: { Authorization: `Bearer ${token}` } }
        );

        expect(statusResponse.data.success).toBe(true);
    });

    afterAll(async () => {
        // Cleanup
        if (orderId) {
            await axios.delete(`${API_BASE}/sales/orders/${orderId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
        }

        if (customerId) {
            await axios.delete(`${API_BASE}/customers/${customerId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
        }

        if (productId) {
            await axios.delete(`${API_BASE}/products/${productId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
        }
    });
});
```

## Automated Testing

### GitHub Actions CI/CD

```yaml
# .github/workflows/api-tests.yml
name: API Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:13
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: agromart_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
    - uses: actions/checkout@v2

    - name: Setup Go
      uses: actions/setup-go@v2
      with:
        go-version: 1.19

    - name: Cache Go modules
      uses: actions/cache@v2
      with:
        path: ~/go/pkg/mod
        key: ${{ runner.os }}-go-${{ hashFiles('**/go.sum') }}
        restore-keys: |
          ${{ runner.os }}-go-

    - name: Install dependencies
      run: |
        cd apps/server
        go mod download

    - name: Run Go tests
      run: |
        cd apps/server
        go test ./... -v -coverprofile=coverage.out

    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '16'

    - name: Install Node.js dependencies
      run: |
        cd apps/server
        npm install

    - name: Run API tests
      run: |
        cd apps/server
        npm test

    - name: Upload coverage reports
      uses: codecov/codecov-action@v2
      with:
        file: ./apps/server/coverage.out
        flags: go

  load-test:
    runs-on: ubuntu-latest
    needs: test

    steps:
    - name: Run load tests
      run: |
        # Install k6
        curl -s https://dl.k6.io/key.gpg | sudo apt-key add -
        sudo apt-get update
        sudo apt-get install k6

        # Run load test
        k6 run load_test.js
```

### Docker Testing Environment

```dockerfile
# Dockerfile.test
FROM golang:1.19-alpine

WORKDIR /app

# Install testing dependencies
RUN apk add --no-cache curl postgresql-client

# Copy source code
COPY . .

# Install Go dependencies
RUN go mod download

# Run tests
CMD ["go", "test", "./...", "-v", "-race", "-coverprofile=coverage.out"]
```

```bash
# Run tests in Docker
docker build -f Dockerfile.test -t agromart-test .
docker run --network host -e DATABASE_URL=postgres://localhost agromart-test
```

This comprehensive testing guide covers all aspects of API testing from basic authentication to complex end-to-end workflows, ensuring the AgroMart API is robust and reliable.