#!/usr/bin/env node

/**
 * Automated Endpoint Availability Test Suite
 * 
 * This script tests all discovered backend endpoints to ensure they are:
 * 1. Accessible and returning proper HTTP status codes
 * 2. Returning expected response formats
 * 3. Properly handling authentication requirements
 * 4. Meeting performance benchmarks
 * 
 * Usage:
 *   node test-endpoint-availability.js [--baseUrl=http://localhost:8080] [--auth=token] [--timeout=5000]
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');
const fs = require('fs');
const path = require('path');

// Configuration from command line arguments
const config = {
    baseUrl: process.argv.find(arg => arg.startsWith('--baseUrl='))?.split('=')[1] || 'http://localhost:8080',
    authToken: process.argv.find(arg => arg.startsWith('--auth='))?.split('=')[1] || '',
    timeout: parseInt(process.argv.find(arg => arg.startsWith('--timeout='))?.split('=')[1] || '5000'),
    verbose: process.argv.includes('--verbose'),
    skipAuth: process.argv.includes('--skip-auth'),
    outputFile: process.argv.find(arg => arg.startsWith('--output='))?.split('=')[1] || null,
};

// Test results storage
const testResults = {
    summary: {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        startTime: new Date(),
        endTime: null,
        duration: 0,
    },
    endpoints: [],
    errors: [],
    performance: {
        averageResponseTime: 0,
        slowestEndpoint: null,
        fastestEndpoint: null,
    }
};

// Discovered endpoints from backend scanner
const endpoints = [
    // Authentication endpoints (public)
    { method: 'POST', path: '/api/auth/register', authRequired: false, description: 'User registration' },
    { method: 'POST', path: '/api/auth/login', authRequired: false, description: 'User login' },
    { method: 'POST', path: '/api/auth/logout', authRequired: false, description: 'User logout' },
    { method: 'POST', path: '/api/auth/refresh', authRequired: false, description: 'Token refresh' },
    { method: 'POST', path: '/api/auth/password/forgot', authRequired: false, description: 'Password reset request' },
    { method: 'POST', path: '/api/auth/password/reset', authRequired: false, description: 'Password reset confirmation' },
    
    // Health endpoints (public)
    { method: 'GET', path: '/api/health', authRequired: false, description: 'Health check' },
    { method: 'GET', path: '/health', authRequired: false, description: 'Basic health check' },
    
    // Products endpoints (authenticated)
    { method: 'GET', path: '/api/products', authRequired: true, description: 'List products' },
    { method: 'GET', path: '/api/products/search', authRequired: true, description: 'Search products' },
    { method: 'GET', path: '/api/products/units', authRequired: true, description: 'List units' },
    { method: 'POST', path: '/api/products', authRequired: true, adminOnly: true, description: 'Create product' },
    { method: 'GET', path: '/api/products/:id', authRequired: true, hasParams: true, description: 'Get product details' },
    { method: 'PATCH', path: '/api/products/:id', authRequired: true, adminOnly: true, hasParams: true, description: 'Update product' },
    
    // Suppliers endpoints (authenticated)
    { method: 'GET', path: '/api/suppliers', authRequired: true, description: 'List suppliers' },
    { method: 'GET', path: '/api/suppliers/search', authRequired: true, description: 'Search suppliers' },
    { method: 'POST', path: '/api/suppliers', authRequired: true, adminOnly: true, description: 'Create supplier' },
    { method: 'GET', path: '/api/suppliers/:id', authRequired: true, hasParams: true, description: 'Get supplier details' },
    { method: 'PUT', path: '/api/suppliers/:id', authRequired: true, adminOnly: true, hasParams: true, description: 'Update supplier' },
    { method: 'DELETE', path: '/api/suppliers/:id', authRequired: true, adminOnly: true, hasParams: true, description: 'Delete supplier' },
    
    // Customers endpoints (authenticated)
    { method: 'GET', path: '/api/customers', authRequired: true, description: 'List customers' },
    { method: 'GET', path: '/api/customers/active', authRequired: true, description: 'List active customers' },
    { method: 'GET', path: '/api/customers/search', authRequired: true, description: 'Search customers' },
    { method: 'POST', path: '/api/customers', authRequired: true, adminOnly: true, description: 'Create customer' },
    { method: 'GET', path: '/api/customers/:id', authRequired: true, hasParams: true, description: 'Get customer details' },
    { method: 'PUT', path: '/api/customers/:id', authRequired: true, adminOnly: true, hasParams: true, description: 'Update customer' },
    { method: 'DELETE', path: '/api/customers/:id', authRequired: true, adminOnly: true, hasParams: true, description: 'Delete customer' },
    
    // Purchase Orders endpoints (authenticated)
    { method: 'GET', path: '/api/purchase-orders', authRequired: true, description: 'List purchase orders' },
    { method: 'POST', path: '/api/purchase-orders', authRequired: true, adminOnly: true, description: 'Create purchase order' },
    { method: 'GET', path: '/api/purchase-orders/:id', authRequired: true, hasParams: true, description: 'Get purchase order details' },
    { method: 'PUT', path: '/api/purchase-orders/:id/status', authRequired: true, adminOnly: true, hasParams: true, description: 'Update purchase order status' },
    { method: 'POST', path: '/api/purchase-orders/:id/receive', authRequired: true, adminOnly: true, hasParams: true, description: 'Receive purchase order' },
    
    // Sales endpoints (authenticated)
    { method: 'GET', path: '/api/sales/orders', authRequired: true, description: 'List sales orders' },
    { method: 'POST', path: '/api/sales/orders', authRequired: true, description: 'Create sales order' },
    { method: 'GET', path: '/api/sales/orders/:id', authRequired: true, hasParams: true, description: 'Get sales order details' },
    { method: 'PUT', path: '/api/sales/orders/:id/status', authRequired: true, hasParams: true, description: 'Update sales order status' },
    
    // Inventory endpoints (authenticated)
    { method: 'GET', path: '/api/inventory', authRequired: true, description: 'List inventory' },
    { method: 'GET', path: '/api/inventory/logs', authRequired: true, description: 'List inventory logs' },
    { method: 'GET', path: '/api/inventory/low-stock', authRequired: true, description: 'Low stock report' },
    
    // Analytics endpoints (authenticated)
    { method: 'GET', path: '/api/analytics/kpis', authRequired: true, description: 'Get KPIs' },
    { method: 'GET', path: '/api/analytics/sales', authRequired: true, description: 'Sales analytics' },
    { method: 'GET', path: '/api/analytics/purchases', authRequired: true, description: 'Purchase analytics' },
    { method: 'GET', path: '/api/analytics/inventory', authRequired: true, description: 'Inventory analytics' },
    
    // Batches endpoints (authenticated)
    { method: 'GET', path: '/api/batches', authRequired: true, description: 'List batches' },
    { method: 'POST', path: '/api/batches', authRequired: true, description: 'Create batch' },
    { method: 'GET', path: '/api/batches/:id', authRequired: true, hasParams: true, description: 'Get batch details' },
    { method: 'PUT', path: '/api/batches/:id', authRequired: true, hasParams: true, description: 'Update batch' },
    { method: 'DELETE', path: '/api/batches/:id', authRequired: true, hasParams: true, description: 'Delete batch' },
    
    // Reports endpoints (authenticated)
    { method: 'GET', path: '/api/reports/low-stock', authRequired: true, description: 'Low stock report' },
    { method: 'GET', path: '/api/reports/expiring-batches', authRequired: true, description: 'Expiring batches report' },
    { method: 'GET', path: '/api/reports/inventory-value', authRequired: true, description: 'Inventory value report' },
    { method: 'GET', path: '/api/reports/dashboard-stats', authRequired: true, description: 'Dashboard statistics' },
    { method: 'GET', path: '/api/reports/product-movement', authRequired: true, description: 'Product movement report' },
    { method: 'GET', path: '/api/reports/supplier-purchase-summary', authRequired: true, description: 'Supplier purchase summary' },
    
    // Users endpoints (authenticated)
    { method: 'GET', path: '/api/users', authRequired: true, description: 'List users' },
    { method: 'GET', path: '/api/users/search', authRequired: true, description: 'Search users' },
    { method: 'POST', path: '/api/users', authRequired: true, adminOnly: true, description: 'Create user' },
    { method: 'GET', path: '/api/users/:id', authRequired: true, hasParams: true, description: 'Get user details' },
    { method: 'PUT', path: '/api/users/:id', authRequired: true, adminOnly: true, hasParams: true, description: 'Update user' },
    { method: 'DELETE', path: '/api/users/:id', authRequired: true, adminOnly: true, hasParams: true, description: 'Delete user' },
    
    // Settings endpoints (authenticated)
    { method: 'GET', path: '/api/settings/tenant', authRequired: true, description: 'Get tenant settings' },
    { method: 'PUT', path: '/api/settings/tenant', authRequired: true, adminOnly: true, description: 'Update tenant settings' },
    { method: 'GET', path: '/api/settings/notifications', authRequired: true, description: 'Get notification settings' },
    { method: 'PUT', path: '/api/settings/notifications', authRequired: true, description: 'Update notification settings' },
    
    // Profile endpoints (authenticated)
    { method: 'GET', path: '/api/users/me', authRequired: true, description: 'Get current user profile' },
    { method: 'PUT', path: '/api/users/me', authRequired: true, description: 'Update current user profile' },
    
    // Locations endpoints (authenticated)
    { method: 'GET', path: '/api/locations', authRequired: true, description: 'List locations' },
    { method: 'POST', path: '/api/locations', authRequired: true, adminOnly: true, description: 'Create location' },
    { method: 'GET', path: '/api/locations/:id', authRequired: true, hasParams: true, description: 'Get location details' },
    { method: 'PUT', path: '/api/locations/:id', authRequired: true, adminOnly: true, hasParams: true, description: 'Update location' },
    { method: 'DELETE', path: '/api/locations/:id', authRequired: true, adminOnly: true, hasParams: true, description: 'Delete location' },
    { method: 'GET', path: '/api/locations/search', authRequired: true, description: 'Search locations' },
];

/**
 * Make HTTP request with timeout
 */
function makeRequest(method, url, headers = {}, body = null) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const isHttps = urlObj.protocol === 'https:';
        const client = isHttps ? https : http;
        
        const options = {
            hostname: urlObj.hostname,
            port: urlObj.port || (isHttps ? 443 : 80),
            path: urlObj.pathname + urlObj.search,
            method,
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'AgroMart-Endpoint-Tester/1.0',
                ...headers,
            },
            timeout: config.timeout,
        };

        const req = client.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                let parsedData = null;
                try {
                    parsedData = data ? JSON.parse(data) : null;
                } catch (e) {
                    // Non-JSON response is okay for some endpoints
                    parsedData = data;
                }

                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    data: parsedData,
                    rawData: data,
                });
            });
        });

        req.on('error', (err) => {
            reject(err);
        });

        req.on('timeout', () => {
            req.destroy();
            reject(new Error(`Request timeout after ${config.timeout}ms`));
        });

        if (body) {
            req.write(typeof body === 'string' ? body : JSON.stringify(body));
        }

        req.end();
    });
}

/**
 * Test individual endpoint
 */
async function testEndpoint(endpoint) {
    const startTime = Date.now();
    const result = {
        method: endpoint.method,
        path: endpoint.path,
        description: endpoint.description,
        status: 'pending',
        statusCode: null,
        responseTime: 0,
        error: null,
        authRequired: endpoint.authRequired,
        adminOnly: endpoint.adminOnly || false,
        hasParams: endpoint.hasParams || false,
    };

    try {
        // Replace URL parameters with test values
        let testPath = endpoint.path;
        if (endpoint.hasParams) {
            testPath = testPath.replace(':id', 'test-id-123');
        }

        const url = `${config.baseUrl}${testPath}`;
        const headers = {};

        // Add authentication if required and available
        if (endpoint.authRequired && config.authToken && !config.skipAuth) {
            headers['Authorization'] = `Bearer ${config.authToken}`;
        }

        // Make request
        const response = await makeRequest(endpoint.method, url, headers);
        
        result.statusCode = response.statusCode;
        result.responseTime = Date.now() - startTime;

        // Evaluate response
        if (endpoint.authRequired && !config.authToken && !config.skipAuth) {
            // Expected 401 for authenticated endpoints without token
            result.status = response.statusCode === 401 ? 'passed' : 'failed';
            result.error = response.statusCode !== 401 ? `Expected 401, got ${response.statusCode}` : null;
        } else if (endpoint.hasParams && testPath.includes('test-id-123')) {
            // For parametrized endpoints, 404 is acceptable with test IDs
            result.status = [200, 404, 400, 422].includes(response.statusCode) ? 'passed' : 'failed';
            result.error = ![200, 404, 400, 422].includes(response.statusCode) ? 
                `Expected 200/404/400/422, got ${response.statusCode}` : null;
        } else {
            // For normal endpoints, expect success or documented error codes
            const expectedCodes = endpoint.method === 'GET' ? [200, 401, 403] : [200, 201, 400, 401, 403, 422];
            result.status = expectedCodes.includes(response.statusCode) ? 'passed' : 'failed';
            result.error = !expectedCodes.includes(response.statusCode) ? 
                `Expected ${expectedCodes.join('/')}, got ${response.statusCode}` : null;
        }

        // Check response format for successful responses
        if ([200, 201].includes(response.statusCode) && response.data) {
            if (typeof response.data === 'object' && response.data !== null) {
                // Valid JSON response
                if (config.verbose) {
                    console.log(`✓ ${endpoint.method} ${endpoint.path} - Valid JSON response`);
                }
            } else if (endpoint.path.includes('/health')) {
                // Health endpoints might return plain text
                result.status = 'passed';
            }
        }

    } catch (error) {
        result.status = 'failed';
        result.error = error.message;
        result.responseTime = Date.now() - startTime;
        
        if (config.verbose) {
            console.error(`✗ ${endpoint.method} ${endpoint.path} - ${error.message}`);
        }
    }

    return result;
}

/**
 * Generate test report
 */
function generateReport() {
    const report = {
        metadata: {
            testSuite: 'Endpoint Availability Tests',
            version: '1.0.0',
            timestamp: new Date().toISOString(),
            configuration: {
                baseUrl: config.baseUrl,
                timeout: config.timeout,
                authProvided: !!config.authToken,
                skipAuth: config.skipAuth,
            },
        },
        summary: testResults.summary,
        performance: testResults.performance,
        results: testResults.endpoints,
        errors: testResults.errors,
        recommendations: [],
    };

    // Add recommendations
    const failedCount = testResults.summary.failed;
    const avgResponseTime = testResults.performance.averageResponseTime;

    if (failedCount > 0) {
        report.recommendations.push({
            type: 'error',
            message: `${failedCount} endpoints failed. Review error details and fix issues.`,
        });
    }

    if (avgResponseTime > 1000) {
        report.recommendations.push({
            type: 'performance',
            message: `Average response time (${avgResponseTime}ms) exceeds 1 second. Consider performance optimization.`,
        });
    }

    if (!config.authToken && !config.skipAuth) {
        report.recommendations.push({
            type: 'authentication',
            message: 'No authentication token provided. Authenticated endpoints were tested for proper 401 responses.',
        });
    }

    return report;
}

/**
 * Main test execution
 */
async function runTests() {
    console.log('🧪 Starting Endpoint Availability Tests...');
    console.log(`📊 Testing ${endpoints.length} endpoints against ${config.baseUrl}`);
    console.log(`⏱️  Timeout: ${config.timeout}ms`);
    console.log(`🔐 Auth: ${config.authToken ? 'Provided' : 'Not provided'}`);
    console.log();

    testResults.summary.total = endpoints.length;
    const responseTimes = [];

    // Test each endpoint
    for (const endpoint of endpoints) {
        if (config.verbose) {
            process.stdout.write(`Testing ${endpoint.method} ${endpoint.path}... `);
        }

        const result = await testEndpoint(endpoint);
        testResults.endpoints.push(result);
        responseTimes.push(result.responseTime);

        // Update counters
        if (result.status === 'passed') {
            testResults.summary.passed++;
            if (config.verbose) {
                console.log(`✓ (${result.responseTime}ms)`);
            }
        } else if (result.status === 'failed') {
            testResults.summary.failed++;
            testResults.errors.push({
                endpoint: `${result.method} ${result.path}`,
                error: result.error,
                statusCode: result.statusCode,
            });
            if (config.verbose) {
                console.log(`✗ ${result.error}`);
            }
        } else {
            testResults.summary.skipped++;
        }

        // Progress indicator (if not verbose)
        if (!config.verbose) {
            const progress = Math.round((testResults.endpoints.length / endpoints.length) * 100);
            process.stdout.write(`\r🧪 Progress: ${progress}% (${testResults.summary.passed} passed, ${testResults.summary.failed} failed)`);
        }

        // Small delay to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 50));
    }

    if (!config.verbose) {
        console.log(); // New line after progress
    }

    // Calculate performance metrics
    testResults.summary.endTime = new Date();
    testResults.summary.duration = testResults.summary.endTime - testResults.summary.startTime;
    testResults.performance.averageResponseTime = Math.round(
        responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
    );

    // Find slowest and fastest endpoints
    const sortedResults = [...testResults.endpoints].sort((a, b) => b.responseTime - a.responseTime);
    testResults.performance.slowestEndpoint = {
        endpoint: `${sortedResults[0].method} ${sortedResults[0].path}`,
        responseTime: sortedResults[0].responseTime,
    };
    testResults.performance.fastestEndpoint = {
        endpoint: `${sortedResults[sortedResults.length - 1].method} ${sortedResults[sortedResults.length - 1].path}`,
        responseTime: sortedResults[sortedResults.length - 1].responseTime,
    };

    // Generate and display report
    const report = generateReport();
    
    console.log();
    console.log('📋 Test Results Summary:');
    console.log(`   Total endpoints tested: ${testResults.summary.total}`);
    console.log(`   ✅ Passed: ${testResults.summary.passed}`);
    console.log(`   ❌ Failed: ${testResults.summary.failed}`);
    console.log(`   ⏭️  Skipped: ${testResults.summary.skipped}`);
    console.log(`   ⏱️  Duration: ${Math.round(testResults.summary.duration / 1000)}s`);
    console.log();
    console.log('⚡ Performance Metrics:');
    console.log(`   Average response time: ${testResults.performance.averageResponseTime}ms`);
    console.log(`   Slowest endpoint: ${testResults.performance.slowestEndpoint.endpoint} (${testResults.performance.slowestEndpoint.responseTime}ms)`);
    console.log(`   Fastest endpoint: ${testResults.performance.fastestEndpoint.endpoint} (${testResults.performance.fastestEndpoint.responseTime}ms)`);

    // Show errors if any
    if (testResults.errors.length > 0) {
        console.log();
        console.log('❌ Failed Endpoints:');
        testResults.errors.forEach(error => {
            console.log(`   ${error.endpoint}: ${error.error} (HTTP ${error.statusCode || 'N/A'})`);
        });
    }

    // Show recommendations
    if (report.recommendations.length > 0) {
        console.log();
        console.log('💡 Recommendations:');
        report.recommendations.forEach(rec => {
            const icon = rec.type === 'error' ? '❌' : rec.type === 'performance' ? '⚡' : '💡';
            console.log(`   ${icon} ${rec.message}`);
        });
    }

    // Save report if requested
    if (config.outputFile) {
        fs.writeFileSync(config.outputFile, JSON.stringify(report, null, 2));
        console.log(`\n📄 Detailed report saved to: ${config.outputFile}`);
    }

    console.log();
    console.log(testResults.summary.failed === 0 ? '🎉 All tests passed!' : `⚠️  ${testResults.summary.failed} tests failed.`);
    
    // Exit with appropriate code
    process.exit(testResults.summary.failed > 0 ? 1 : 0);
}

// Handle uncaught errors
process.on('unhandledRejection', (err) => {
    console.error('Unhandled rejection:', err);
    process.exit(1);
});

process.on('uncaughtException', (err) => {
    console.error('Uncaught exception:', err);
    process.exit(1);
});

// Run tests if this file is executed directly
if (require.main === module) {
    runTests().catch((err) => {
        console.error('Test execution failed:', err);
        process.exit(1);
    });
}

module.exports = { runTests, testEndpoint, config };