# API Examples and Use Cases

This document provides comprehensive examples and use cases for the AgroMart API, demonstrating common workflows and integration patterns.

## Table of Contents

1. [Authentication Workflow](#authentication-workflow)
2. [Product Management](#product-management)
3. [Customer Management](#customer-management)
4. [Supplier Management](#supplier-management)
5. [Order Management](#order-management)
6. [Inventory Management](#inventory-management)
7. [File Upload and Management](#file-upload-and-management)
8. [Analytics and Reporting](#analytics-and-reporting)
9. [Error Handling](#error-handling)
10. [Integration Patterns](#integration-patterns)

## Authentication Workflow

### Complete Authentication Flow

```javascript
class AgroMartAPI {
    constructor(baseURL = 'http://localhost:8080/api') {
        this.baseURL = baseURL;
        this.token = null;
        this.refreshToken = null;
    }

    async login(email, password) {
        try {
            const response = await fetch(`${this.baseURL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password })
            });

            const result = await response.json();

            if (result.success) {
                this.token = result.data.token;
                this.refreshToken = result.data.refresh_token;
                return result.data;
            } else {
                throw new Error(result.error?.message || 'Login failed');
            }
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    }

    async refreshAccessToken() {
        try {
            const response = await fetch(`${this.baseURL}/auth/refresh`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    refresh_token: this.refreshToken
                })
            });

            const result = await response.json();

            if (result.success) {
                this.token = result.data.token;
                this.refreshToken = result.data.refresh_token;
                return result.data;
            } else {
                throw new Error('Token refresh failed');
            }
        } catch (error) {
            console.error('Token refresh error:', error);
            throw error;
        }
    }

    async makeAuthenticatedRequest(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const defaultOptions = {
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json',
            }
        };

        const finalOptions = {
            ...defaultOptions,
            ...options,
            headers: {
                ...defaultOptions.headers,
                ...options.headers
            }
        };

        let response = await fetch(url, finalOptions);

        // If token is expired, try to refresh and retry once
        if (response.status === 401) {
            try {
                await this.refreshAccessToken();
                finalOptions.headers.Authorization = `Bearer ${this.token}`;
                response = await fetch(url, finalOptions);
            } catch (refreshError) {
                throw new Error('Authentication failed');
            }
        }

        return response.json();
    }
}
```

### Usage Example

```javascript
const api = new AgroMartAPI();

// Login
await api.login('admin@myfarm.com', 'password123');

// Use authenticated requests
const products = await api.makeAuthenticatedRequest('/products');
console.log(products);
```

## Product Management

### Creating Products with Variants

```javascript
async function createProductWithVariants(api) {
    // Create main product
    const mainProduct = await api.makeAuthenticatedRequest('/products', {
        method: 'POST',
        body: JSON.stringify({
            name: 'Organic Tomatoes',
            sku: 'TOM-ORG-001',
            price: 350,
            price_per_unit: 35,
            unit_id: '550e8400-e29b-41d4-a716-446655440001',
            description: 'Fresh organic tomatoes',
            brand: 'Farm Fresh',
            gst_percent: 5
        })
    });

    console.log('Main product created:', mainProduct.data);

    // Create variant products
    const variants = [
        {
            name: 'Organic Cherry Tomatoes',
            sku: 'TOM-ORG-CHERRY',
            price: 450,
            price_per_unit: 45,
            unit_id: '550e8400-e29b-41d4-a716-446655440001',
            description: 'Sweet cherry tomatoes',
            brand: 'Farm Fresh',
            gst_percent: 5
        },
        {
            name: 'Organic Roma Tomatoes',
            sku: 'TOM-ORG-ROMA',
            price: 300,
            price_per_unit: 30,
            unit_id: '550e8400-e29b-41d4-a716-446655440001',
            description: 'Roma tomatoes perfect for sauces',
            brand: 'Farm Fresh',
            gst_percent: 5
        }
    ];

    for (const variant of variants) {
        const variantProduct = await api.makeAuthenticatedRequest('/products', {
            method: 'POST',
            body: JSON.stringify(variant)
        });
        console.log('Variant created:', variantProduct.data);
    }
}
```

### Bulk Product Operations

```javascript
async function bulkUpdateProducts(api, updates) {
    const results = [];

    for (const update of updates) {
        try {
            const result = await api.makeAuthenticatedRequest(`/products/${update.id}`, {
                method: 'PATCH',
                body: JSON.stringify(update.data)
            });
            results.push({ id: update.id, success: true, data: result.data });
        } catch (error) {
            results.push({ id: update.id, success: false, error: error.message });
        }
    }

    return results;
}

// Usage
const updates = [
    {
        id: '550e8400-e29b-41d4-a716-446655440001',
        data: { price: 400, description: 'Updated price' }
    },
    {
        id: '550e8400-e29b-41d4-a716-446655440002',
        data: { name: 'Updated Product Name' }
    }
];

const bulkResults = await bulkUpdateProducts(api, updates);
console.log(bulkResults);
```

## Customer Management

### Customer Lifecycle Management

```javascript
async function manageCustomerLifecycle(api) {
    // Create customer
    const customer = await api.makeAuthenticatedRequest('/customers', {
        method: 'POST',
        body: JSON.stringify({
            name: 'Green Valley Market',
            contact_person: 'Sarah Johnson',
            email: 'sarah@greenvalley.com',
            phone: '+1234567890',
            address: '123 Market Street, Farmville',
            payment_mode: 'credit'
        })
    });

    const customerId = customer.data.id;
    console.log('Customer created:', customer.data);

    // Update customer information
    const updatedCustomer = await api.makeAuthenticatedRequest(`/customers/${customerId}`, {
        method: 'PUT',
        body: JSON.stringify({
            name: 'Green Valley Organic Market',
            contact_person: 'Sarah Johnson',
            email: 'sarah@greenvalley.com',
            phone: '+1234567890',
            address: '456 New Street, Farmville',
            payment_mode: 'net30'
        })
    });

    console.log('Customer updated:', updatedCustomer.data);

    // Create sales order for customer
    const salesOrder = await api.makeAuthenticatedRequest('/sales/orders', {
        method: 'POST',
        body: JSON.stringify({
            customer_id: customerId,
            items: [
                {
                    product_id: '550e8400-e29b-41d4-a716-446655440001',
                    quantity_ordered: 10,
                    unit_price: 350
                },
                {
                    product_id: '550e8400-e29b-41d4-a716-446655440002',
                    quantity_ordered: 5,
                    unit_price: 450
                }
            ],
            notes: 'Weekly order'
        })
    });

    console.log('Sales order created:', salesOrder.data);
}
```

## Order Management

### Complete Order Workflow

```javascript
async function completeOrderWorkflow(api, customerId) {
    // Create sales order
    const salesOrder = await api.makeAuthenticatedRequest('/sales/orders', {
        method: 'POST',
        body: JSON.stringify({
            customer_id: customerId,
            expected_delivery_date: '2024-01-15',
            items: [
                {
                    product_id: '550e8400-e29b-41d4-a716-446655440001',
                    quantity_ordered: 50,
                    unit_price: 350,
                    discount_percent: 5,
                    notes: 'Premium quality'
                },
                {
                    product_id: '550e8400-e29b-41d4-a716-446655440002',
                    quantity_ordered: 25,
                    unit_price: 450,
                    tax_percent: 8
                }
            ],
            notes: 'Bulk order for restaurant'
        })
    });

    const orderId = salesOrder.data.id;
    console.log('Sales order created:', salesOrder.data);

    // Update order status
    const statusUpdate = await api.makeAuthenticatedRequest(`/sales/orders/${orderId}/status`, {
        method: 'PUT',
        body: JSON.stringify({
            status: 'APPROVED'
        })
    });

    console.log('Order status updated:', statusUpdate.data);

    // Ship items
    for (const item of salesOrder.data.items) {
        const shipment = await api.makeAuthenticatedRequest(`/sales/orders/${orderId}/ship`, {
            method: 'POST',
            body: JSON.stringify({
                item_id: item.id,
                quantity_shipped: item.quantity_ordered
            })
        });
        console.log('Item shipped:', shipment.data);
    }
}
```

## File Upload and Management

### Complete File Upload Workflow

```javascript
async function uploadProductImage(api, productId, imageFile) {
    // Get signed upload URL
    const signedURL = await api.makeAuthenticatedRequest('/files/signed-url', {
        method: 'POST',
        body: JSON.stringify({
            file_name: imageFile.name,
            content_type: imageFile.type,
            entity_type: 'product',
            entity_id: productId,
            file_type: 'image'
        })
    });

    const { upload_url, object_key } = signedURL.data;
    console.log('Signed URL obtained:', upload_url);

    // Upload file directly to storage
    const uploadResponse = await fetch(upload_url, {
        method: 'PUT',
        body: imageFile,
        headers: {
            'Content-Type': imageFile.type
        }
    });

    if (uploadResponse.ok) {
        console.log('File uploaded successfully');

        // Register file in database
        const fileRecord = await api.makeAuthenticatedRequest('/files/upload', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                file_name: imageFile.name,
                content_type: imageFile.type,
                entity_type: 'product',
                entity_id: productId,
                file_type: 'image',
                file_path: object_key
            })
        });

        console.log('File registered:', fileRecord.data);

        // Update product with image URL
        await api.makeAuthenticatedRequest(`/products/${productId}`, {
            method: 'PATCH',
            body: JSON.stringify({
                image_url: fileRecord.data.file_url
            })
        });

        return fileRecord.data;
    } else {
        throw new Error('Upload failed');
    }
}
```

### Batch File Operations

```javascript
async function uploadMultipleImages(api, productId, images) {
    const uploadPromises = images.map((image, index) =>
        uploadProductImage(api, productId, image)
            .then(result => ({ success: true, result, index }))
            .catch(error => ({ success: false, error: error.message, index }))
    );

    const results = await Promise.allSettled(uploadPromises);

    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success);
    const failed = results.filter(r => r.status === 'rejected' || !r.value.success);

    console.log(`Uploaded ${successful.length} images successfully`);
    if (failed.length > 0) {
        console.log(`${failed.length} uploads failed:`, failed);
    }

    return { successful, failed };
}
```

## Analytics and Reporting

### Generate Comprehensive Reports

```javascript
async function generateBusinessReports(api, dateRange) {
    const { from_date, to_date } = dateRange;

    // Get KPI metrics
    const kpis = await api.makeAuthenticatedRequest('/analytics/kpis', {
        method: 'GET'
    });

    console.log('Current KPIs:', kpis.data);

    // Get sales analytics
    const salesData = await api.makeAuthenticatedRequest(
        `/analytics/sales?from_date=${from_date}&to_date=${to_date}&group=month`
    );

    console.log('Sales analytics:', salesData.data);

    // Get purchase analytics
    const purchaseData = await api.makeAuthenticatedRequest(
        `/analytics/purchases?from_date=${from_date}&to_date=${to_date}&group=month`
    );

    console.log('Purchase analytics:', purchaseData.data);

    // Get inventory snapshot
    const inventory = await api.makeAuthenticatedRequest('/analytics/inventory');

    console.log('Inventory snapshot:', inventory.data);

    // Generate reports
    const reports = {
        kpis: kpis.data,
        sales: salesData.data,
        purchases: purchaseData.data,
        inventory: inventory.data,
        generated_at: new Date().toISOString(),
        period: dateRange
    };

    return reports;
}

// Generate monthly report
const monthlyReport = await generateBusinessReports(api, {
    from_date: '2024-01-01',
    to_date: '2024-01-31'
});
```

### Inventory Alerts and Monitoring

```javascript
async function checkInventoryAlerts(api) {
    // Get low stock items
    const lowStock = await api.makeAuthenticatedRequest('/reports/low-stock?threshold=10');
    console.log('Low stock items:', lowStock.data);

    // Get expiring batches
    const expiringBatches = await api.makeAuthenticatedRequest('/reports/expiring-batches?days=30');
    console.log('Expiring batches:', expiringBatches.data);

    // Get inventory value
    const inventoryValue = await api.makeAuthenticatedRequest('/reports/inventory-value');
    console.log('Total inventory value:', inventoryValue.data);

    // Generate alert summary
    const alerts = {
        low_stock_count: lowStock.data.length,
        expiring_batches_count: expiringBatches.data.length,
        total_inventory_value: inventoryValue.data.total_value,
        alerts: []
    };

    // Add low stock alerts
    lowStock.data.forEach(item => {
        alerts.alerts.push({
            type: 'LOW_STOCK',
            severity: 'WARNING',
            message: `${item.product_name} has only ${item.current_stock} units remaining`,
            data: item
        });
    });

    // Add expiry alerts
    expiringBatches.data.forEach(batch => {
        const daysUntilExpiry = Math.ceil(
            (new Date(batch.expiry_date) - new Date()) / (1000 * 60 * 60 * 24)
        );

        alerts.alerts.push({
            type: 'EXPIRING_BATCH',
            severity: daysUntilExpiry <= 7 ? 'CRITICAL' : 'WARNING',
            message: `Batch ${batch.batch_number} expires in ${daysUntilExpiry} days`,
            data: batch
        });
    });

    return alerts;
}
```

## Error Handling

### Comprehensive Error Handling

```javascript
class APIError extends Error {
    constructor(message, statusCode, errorCode, details) {
        super(message);
        this.name = 'APIError';
        this.statusCode = statusCode;
        this.errorCode = errorCode;
        this.details = details;
    }
}

async function handleAPIError(error, operation) {
    if (error.response) {
        const { status, data } = error.response;

        switch (status) {
            case 400:
                throw new APIError(
                    `Validation error in ${operation}: ${data.error?.message}`,
                    status,
                    data.error?.code,
                    data.error?.details
                );

            case 401:
                throw new APIError(
                    `Authentication failed for ${operation}`,
                    status,
                    'AUTHENTICATION_ERROR'
                );

            case 403:
                throw new APIError(
                    `Permission denied for ${operation}`,
                    status,
                    'AUTHORIZATION_ERROR'
                );

            case 404:
                throw new APIError(
                    `Resource not found in ${operation}`,
                    status,
                    'NOT_FOUND'
                );

            case 409:
                throw new APIError(
                    `Conflict in ${operation}: ${data.error?.message}`,
                    status,
                    'CONFLICT',
                    data.error?.details
                );

            case 429:
                throw new APIError(
                    `Rate limit exceeded for ${operation}`,
                    status,
                    'RATE_LIMIT_EXCEEDED'
                );

            default:
                throw new APIError(
                    `Server error in ${operation}: ${data.error?.message}`,
                    status,
                    data.error?.code || 'INTERNAL_ERROR'
                );
        }
    } else if (error.request) {
        throw new APIError(
            `Network error in ${operation}: ${error.message}`,
            0,
            'NETWORK_ERROR'
        );
    } else {
        throw new APIError(
            `Error in ${operation}: ${error.message}`,
            0,
            'UNKNOWN_ERROR'
        );
    }
}

async function safeAPICall(apiCall, operation, retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const result = await apiCall();
            return result;
        } catch (error) {
            if (attempt === retries) {
                await handleAPIError(error, operation);
            }

            // Wait before retry (exponential backoff)
            const delay = Math.pow(2, attempt) * 1000;
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}
```

## Integration Patterns

### Real-time Dashboard Integration

```javascript
class DashboardManager {
    constructor(api) {
        this.api = api;
        this.updateInterval = 30000; // 30 seconds
        this.intervalId = null;
    }

    startUpdates() {
        this.updateDashboard();
        this.intervalId = setInterval(() => {
            this.updateDashboard();
        }, this.updateInterval);
    }

    stopUpdates() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    async updateDashboard() {
        try {
            const [kpis, lowStock, expiringBatches] = await Promise.all([
                this.api.makeAuthenticatedRequest('/analytics/kpis'),
                this.api.makeAuthenticatedRequest('/reports/low-stock'),
                this.api.makeAuthenticatedRequest('/reports/expiring-batches')
            ]);

            this.updateKPIs(kpis.data);
            this.updateAlerts(lowStock.data, expiringBatches.data);

        } catch (error) {
            console.error('Dashboard update failed:', error);
            this.handleDashboardError(error);
        }
    }

    updateKPIs(data) {
        // Update KPI display elements
        document.getElementById('total-sales').textContent = data.total_sales || 0;
        document.getElementById('total-orders').textContent = data.total_orders || 0;
        document.getElementById('low-stock-count').textContent = data.low_stock_items || 0;
        document.getElementById('expiring-batches').textContent = data.expiring_batches || 0;
    }

    updateAlerts(lowStock, expiringBatches) {
        const alertsContainer = document.getElementById('alerts-container');
        alertsContainer.innerHTML = '';

        // Add low stock alerts
        lowStock.forEach(item => {
            const alert = document.createElement('div');
            alert.className = 'alert alert-warning';
            alert.textContent = `${item.product_name}: Only ${item.current_stock} units remaining`;
            alertsContainer.appendChild(alert);
        });

        // Add expiry alerts
        expiringBatches.forEach(batch => {
            const daysUntilExpiry = Math.ceil(
                (new Date(batch.expiry_date) - new Date()) / (1000 * 60 * 60 * 24)
            );

            const alert = document.createElement('div');
            alert.className = daysUntilExpiry <= 7 ? 'alert alert-danger' : 'alert alert-warning';
            alert.textContent = `Batch ${batch.batch_number} expires in ${daysUntilExpiry} days`;
            alertsContainer.appendChild(alert);
        });
    }

    handleDashboardError(error) {
        const errorContainer = document.getElementById('dashboard-error');
        errorContainer.textContent = `Dashboard update failed: ${error.message}`;
        errorContainer.style.display = 'block';

        setTimeout(() => {
            errorContainer.style.display = 'none';
        }, 5000);
    }
}

// Usage
const dashboard = new DashboardManager(api);
dashboard.startUpdates();

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    dashboard.stopUpdates();
});
```

### Batch Processing for Large Datasets

```javascript
async function processLargeDataset(api, endpoint, data, batchSize = 10) {
    const results = {
        successful: [],
        failed: []
    };

    // Split data into batches
    for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);
        const batchPromises = batch.map(item =>
            api.makeAuthenticatedRequest(endpoint, {
                method: 'POST',
                body: JSON.stringify(item)
            })
            .then(result => ({ success: true, data: result.data, original: item }))
            .catch(error => ({ success: false, error: error.message, original: item }))
        );

        const batchResults = await Promise.allSettled(batchPromises);

        batchResults.forEach(result => {
            if (result.status === 'fulfilled') {
                if (result.value.success) {
                    results.successful.push(result.value);
                } else {
                    results.failed.push(result.value);
                }
            } else {
                results.failed.push({
                    success: false,
                    error: result.reason.message,
                    original: null
                });
            }
        });

        // Progress update
        const progress = Math.round(((i + batch.length) / data.length) * 100);
        console.log(`Progress: ${progress}% (${i + batch.length}/${data.length})`);

        // Small delay between batches to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    return results;
}

// Usage example
const products = [
    // Large array of product data
];

const results = await processLargeDataset(api, '/products', products, 10);
console.log(`Processed ${results.successful.length} successfully, ${results.failed.length} failed`);
```

This comprehensive examples document demonstrates the full power and flexibility of the AgroMart API, showing how to implement complex workflows, handle errors gracefully, and integrate with various systems and use cases.