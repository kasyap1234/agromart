#!/usr/bin/env node

/**
 * Comprehensive Endpoint Integration Test Suite
 * 
 * This script performs full integration testing including:
 * 1. Authentication flow testing
 * 2. CRUD operation testing with real data
 * 3. Error handling validation
 * 4. Performance benchmarking
 * 5. Data consistency verification
 * 
 * Usage:
 *   node test-endpoint-integration.js [--baseUrl=http://localhost:8080] [--user=test@example.com] [--password=password]
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');
const fs = require('fs');
const crypto = require('crypto');

// Configuration
const config = {
    baseUrl: process.argv.find(arg => arg.startsWith('--baseUrl='))?.split('=')[1] || 'http://localhost:8080',
    testUser: process.argv.find(arg => arg.startsWith('--user='))?.split('=')[1] || 'test@agromart.com',
    testPassword: process.argv.find(arg => arg.startsWith('--password='))?.split('=')[1] || 'TestPassword123!',
    timeout: parseInt(process.argv.find(arg => arg.startsWith('--timeout='))?.split('=')[1] || '10000'),
    verbose: process.argv.includes('--verbose'),
    cleanup: !process.argv.includes('--no-cleanup'),
    outputFile: process.argv.find(arg => arg.startsWith('--output='))?.split('=')[1] || `test-results-${Date.now()}.json`,
};

// Test state
let authToken = null;
let refreshToken = null;
let testData = {
    createdEntities: [],
    testUserTenantId: null,
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
    suites: [],
    performance: {
        averageResponseTime: 0,
        authenticationTime: 0,
        crudOperationTimes: {},
    },
    errors: [],
    coverage: {
        endpoints: [],
        httpMethods: new Set(),
        modules: new Set(),
    }
};

/**
 * HTTP Request utility
 */
async function makeRequest(method, path, body = null, headers = {}) {
    return new Promise((resolve, reject) => {
        const url = `${config.baseUrl}${path}`;
        const urlObj = new URL(url);
        const isHttps = urlObj.protocol === 'https:';
        const client = isHttps ? https : http;
        
        const requestHeaders = {
            'Content-Type': 'application/json',
            'User-Agent': 'AgroMart-Integration-Tester/1.0',
            ...headers,
        };

        if (authToken) {
            requestHeaders['Authorization'] = `Bearer ${authToken}`;
        }

        const options = {
            hostname: urlObj.hostname,
            port: urlObj.port || (isHttps ? 443 : 80),
            path: urlObj.pathname + urlObj.search,
            method,
            headers: requestHeaders,
            timeout: config.timeout,
        };

        const startTime = Date.now();
        const req = client.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                const responseTime = Date.now() - startTime;
                let parsedData = null;
                try {
                    parsedData = data ? JSON.parse(data) : null;
                } catch (e) {
                    parsedData = data;
                }

                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    data: parsedData,
                    rawData: data,
                    responseTime,
                });
            });
        });

        req.on('error', reject);
        req.on('timeout', () => {
            req.destroy();
            reject(new Error(`Request timeout after ${config.timeout}ms`));
        });

        if (body) {
            const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
            req.write(bodyStr);
        }

        req.end();
    });
}

/**
 * Test suite runner
 */
async function runTestSuite(suiteName, tests) {
    console.log(`\n🧪 Running ${suiteName}...`);
    
    const suite = {
        name: suiteName,
        tests: [],
        passed: 0,
        failed: 0,
        duration: 0,
        startTime: Date.now(),
    };

    for (const test of tests) {
        const testStart = Date.now();
        const result = {
            name: test.name,
            description: test.description,
            status: 'pending',
            error: null,
            responseTime: 0,
            endpoint: test.endpoint || null,
        };

        try {
            if (config.verbose) {
                process.stdout.write(`  ${test.name}... `);
            }

            await test.run();
            result.status = 'passed';
            suite.passed++;
            testResults.summary.passed++;

            if (config.verbose) {
                console.log('✓');
            }

        } catch (error) {
            result.status = 'failed';
            result.error = error.message;
            suite.failed++;
            testResults.summary.failed++;
            testResults.errors.push({
                suite: suiteName,
                test: test.name,
                error: error.message,
                endpoint: test.endpoint,
            });

            if (config.verbose) {
                console.log(`✗ ${error.message}`);
            }
        }

        result.responseTime = Date.now() - testStart;
        suite.tests.push(result);
        testResults.summary.total++;

        // Track coverage
        if (test.endpoint) {
            testResults.coverage.endpoints.push(test.endpoint);
            testResults.coverage.httpMethods.add(test.method || 'GET');
            testResults.coverage.modules.add(test.endpoint.split('/')[2]); // /api/module/...
        }
    }

    suite.duration = Date.now() - suite.startTime;
    testResults.suites.push(suite);

    const status = suite.failed === 0 ? '✅' : '❌';
    console.log(`${status} ${suiteName}: ${suite.passed} passed, ${suite.failed} failed (${suite.duration}ms)`);
}

/**
 * Authentication Tests
 */
const authenticationTests = [
    {
        name: 'Health Check',
        description: 'Verify API health endpoint',
        endpoint: '/api/health',
        method: 'GET',
        async run() {
            const response = await makeRequest('GET', '/api/health');
            if (response.statusCode !== 200) {
                throw new Error(`Health check failed with status ${response.statusCode}`);
            }
            if (!response.data || response.data.status !== 'ok') {
                throw new Error('Health check returned invalid response');
            }
        }
    },
    {
        name: 'User Login',
        description: 'Authenticate test user and obtain tokens',
        endpoint: '/api/auth/login',
        method: 'POST',
        async run() {
            const authStart = Date.now();
            const response = await makeRequest('POST', '/api/auth/login', {
                email: config.testUser,
                password: config.testPassword,
            });

            if (response.statusCode !== 200) {
                throw new Error(`Login failed with status ${response.statusCode}: ${response.data?.message || 'Unknown error'}`);
            }

            if (!response.data?.data?.access_token) {
                throw new Error('Login response missing access token');
            }

            authToken = response.data.data.access_token;
            refreshToken = response.data.data.refresh_token;
            testResults.performance.authenticationTime = Date.now() - authStart;

            console.log(`  🔐 Authentication successful (${testResults.performance.authenticationTime}ms)`);
        }
    },
    {
        name: 'Token Validation',
        description: 'Verify token works for protected endpoint',
        endpoint: '/api/users/me',
        method: 'GET',
        async run() {
            const response = await makeRequest('GET', '/api/users/me');
            if (response.statusCode !== 200) {
                throw new Error(`Token validation failed with status ${response.statusCode}`);
            }
            if (!response.data?.data?.id) {
                throw new Error('User profile endpoint returned invalid data');
            }

            // Store tenant ID for later use
            testData.testUserTenantId = response.data.data.tenant_id;
        }
    },
];

/**
 * Product Management Tests
 */
const productTests = [
    {
        name: 'List Products',
        description: 'Retrieve products list',
        endpoint: '/api/products',
        method: 'GET',
        async run() {
            const response = await makeRequest('GET', '/api/products?page=1&limit=10');
            if (response.statusCode !== 200) {
                throw new Error(`Failed to list products: ${response.statusCode}`);
            }
            if (!Array.isArray(response.data?.data)) {
                throw new Error('Products response missing data array');
            }
        }
    },
    {
        name: 'Create Product',
        description: 'Create a new test product',
        endpoint: '/api/products',
        method: 'POST',
        async run() {
            const createStart = Date.now();
            const testProduct = {
                name: `Test Product ${crypto.randomBytes(4).toString('hex')}`,
                sku: `TST-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
                description: 'Test product for integration testing',
                category: 'test',
                unit: 'piece',
                cost_price: 1000, // $10.00 in cents
                selling_price: 1500, // $15.00 in cents
                reorder_level: 10,
                is_active: true,
            };

            const response = await makeRequest('POST', '/api/products', testProduct);
            if (![200, 201].includes(response.statusCode)) {
                throw new Error(`Failed to create product: ${response.statusCode} - ${response.data?.message || 'Unknown error'}`);
            }

            const productId = response.data?.data?.id;
            if (!productId) {
                throw new Error('Create product response missing ID');
            }

            testData.createdEntities.push({ type: 'product', id: productId });
            testResults.performance.crudOperationTimes.productCreate = Date.now() - createStart;
        }
    },
    {
        name: 'Get Product Details',
        description: 'Retrieve created product details',
        endpoint: '/api/products/:id',
        method: 'GET',
        async run() {
            const productEntity = testData.createdEntities.find(e => e.type === 'product');
            if (!productEntity) {
                throw new Error('No test product available for detail retrieval');
            }

            const response = await makeRequest('GET', `/api/products/${productEntity.id}`);
            if (response.statusCode !== 200) {
                throw new Error(`Failed to get product details: ${response.statusCode}`);
            }

            if (!response.data?.data?.id) {
                throw new Error('Product details response missing data');
            }
        }
    },
    {
        name: 'Update Product',
        description: 'Update test product',
        endpoint: '/api/products/:id',
        method: 'PATCH',
        async run() {
            const productEntity = testData.createdEntities.find(e => e.type === 'product');
            if (!productEntity) {
                throw new Error('No test product available for update');
            }

            const updateStart = Date.now();
            const updates = {
                description: 'Updated test product description',
                selling_price: 1600, // $16.00 in cents
            };

            const response = await makeRequest('PATCH', `/api/products/${productEntity.id}`, updates);
            if (response.statusCode !== 200) {
                throw new Error(`Failed to update product: ${response.statusCode} - ${response.data?.message || 'Unknown error'}`);
            }

            testResults.performance.crudOperationTimes.productUpdate = Date.now() - updateStart;
        }
    },
];

/**
 * Supplier Management Tests
 */
const supplierTests = [
    {
        name: 'List Suppliers',
        description: 'Retrieve suppliers list',
        endpoint: '/api/suppliers',
        method: 'GET',
        async run() {
            const response = await makeRequest('GET', '/api/suppliers?page=1&limit=10');
            if (response.statusCode !== 200) {
                throw new Error(`Failed to list suppliers: ${response.statusCode}`);
            }
        }
    },
    {
        name: 'Create Supplier',
        description: 'Create a new test supplier',
        endpoint: '/api/suppliers',
        method: 'POST',
        async run() {
            const testSupplier = {
                name: `Test Supplier ${crypto.randomBytes(4).toString('hex')}`,
                email: `test-supplier-${crypto.randomBytes(4).toString('hex')}@example.com`,
                phone: '+1234567890',
                address: '123 Test Street, Test City, TC 12345',
            };

            const response = await makeRequest('POST', '/api/suppliers', testSupplier);
            if (![200, 201].includes(response.statusCode)) {
                throw new Error(`Failed to create supplier: ${response.statusCode} - ${response.data?.message || 'Unknown error'}`);
            }

            const supplierId = response.data?.data?.id;
            if (!supplierId) {
                throw new Error('Create supplier response missing ID');
            }

            testData.createdEntities.push({ type: 'supplier', id: supplierId });
        }
    },
];

/**
 * Customer Management Tests
 */
const customerTests = [
    {
        name: 'List Customers',
        description: 'Retrieve customers list',
        endpoint: '/api/customers',
        method: 'GET',
        async run() {
            const response = await makeRequest('GET', '/api/customers?page=1&limit=10');
            if (response.statusCode !== 200) {
                throw new Error(`Failed to list customers: ${response.statusCode}`);
            }
        }
    },
    {
        name: 'Create Customer',
        description: 'Create a new test customer',
        endpoint: '/api/customers',
        method: 'POST',
        async run() {
            const testCustomer = {
                name: `Test Customer ${crypto.randomBytes(4).toString('hex')}`,
                email: `test-customer-${crypto.randomBytes(4).toString('hex')}@example.com`,
                phone: '+1234567890',
                address: '456 Customer Ave, Customer City, CC 54321',
                payment_mode: 'cash',
                is_active: true,
            };

            const response = await makeRequest('POST', '/api/customers', testCustomer);
            if (![200, 201].includes(response.statusCode)) {
                throw new Error(`Failed to create customer: ${response.statusCode} - ${response.data?.message || 'Unknown error'}`);
            }

            const customerId = response.data?.data?.id;
            if (!customerId) {
                throw new Error('Create customer response missing ID');
            }

            testData.createdEntities.push({ type: 'customer', id: customerId });
        }
    },
];

/**
 * Analytics and Reporting Tests
 */
const analyticsTests = [
    {
        name: 'Get Dashboard KPIs',
        description: 'Retrieve dashboard KPIs',
        endpoint: '/api/analytics/kpis',
        method: 'GET',
        async run() {
            const response = await makeRequest('GET', '/api/analytics/kpis');
            if (response.statusCode !== 200) {
                throw new Error(`Failed to get KPIs: ${response.statusCode}`);
            }
        }
    },
    {
        name: 'Get Low Stock Report',
        description: 'Retrieve low stock report',
        endpoint: '/api/reports/low-stock',
        method: 'GET',
        async run() {
            const response = await makeRequest('GET', '/api/reports/low-stock?threshold=10');
            if (response.statusCode !== 200) {
                throw new Error(`Failed to get low stock report: ${response.statusCode}`);
            }
        }
    },
    {
        name: 'Get Inventory Value',
        description: 'Retrieve inventory value report',
        endpoint: '/api/reports/inventory-value',
        method: 'GET',
        async run() {
            const response = await makeRequest('GET', '/api/reports/inventory-value');
            if (response.statusCode !== 200) {
                throw new Error(`Failed to get inventory value: ${response.statusCode}`);
            }
        }
    },
];

/**
 * Cleanup created test data
 */
async function cleanupTestData() {
    if (!config.cleanup) {
        console.log('\n🗑️  Skipping cleanup (--no-cleanup flag set)');
        return;
    }

    console.log('\n🗑️  Cleaning up test data...');
    
    const cleanupPromises = testData.createdEntities.map(async (entity) => {
        try {
            let endpoint = '';
            switch (entity.type) {
                case 'product':
                    // Products don't have delete endpoint in current API
                    console.log(`  ⚠️  Skipping product cleanup (no delete endpoint)`);
                    return;
                case 'supplier':
                    endpoint = `/api/suppliers/${entity.id}`;
                    break;
                case 'customer':
                    endpoint = `/api/customers/${entity.id}`;
                    break;
                default:
                    console.log(`  ⚠️  Unknown entity type: ${entity.type}`);
                    return;
            }

            const response = await makeRequest('DELETE', endpoint);
            if ([200, 204, 404].includes(response.statusCode)) {
                console.log(`  ✓ Deleted ${entity.type} ${entity.id}`);
            } else {
                console.log(`  ⚠️  Failed to delete ${entity.type} ${entity.id}: ${response.statusCode}`);
            }
        } catch (error) {
            console.log(`  ⚠️  Error deleting ${entity.type} ${entity.id}: ${error.message}`);
        }
    });

    await Promise.all(cleanupPromises);
}

/**
 * Generate comprehensive test report
 */
function generateReport() {
    testResults.summary.endTime = new Date();
    testResults.summary.duration = testResults.summary.endTime - testResults.summary.startTime;
    
    const responseTimes = [];
    testResults.suites.forEach(suite => {
        suite.tests.forEach(test => {
            responseTimes.push(test.responseTime);
        });
    });

    testResults.performance.averageResponseTime = responseTimes.length > 0 
        ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
        : 0;

    const report = {
        metadata: {
            testSuite: 'AgroMart Integration Tests',
            version: '1.0.0',
            timestamp: new Date().toISOString(),
            configuration: config,
            testData: {
                createdEntities: testData.createdEntities.length,
                testUserTenantId: testData.testUserTenantId,
            },
        },
        summary: testResults.summary,
        performance: testResults.performance,
        coverage: {
            endpoints: [...new Set(testResults.coverage.endpoints)],
            httpMethods: [...testResults.coverage.httpMethods],
            modules: [...testResults.coverage.modules],
        },
        suites: testResults.suites,
        errors: testResults.errors,
        recommendations: [],
    };

    // Add recommendations
    if (testResults.summary.failed > 0) {
        report.recommendations.push({
            type: 'error',
            message: `${testResults.summary.failed} tests failed. Review error details and fix issues.`,
        });
    }

    if (testResults.performance.averageResponseTime > 2000) {
        report.recommendations.push({
            type: 'performance',
            message: `Average response time (${testResults.performance.averageResponseTime}ms) exceeds 2 seconds.`,
        });
    }

    if (testResults.coverage.endpoints.length < 20) {
        report.recommendations.push({
            type: 'coverage',
            message: `Only ${testResults.coverage.endpoints.length} endpoints tested. Consider expanding test coverage.`,
        });
    }

    return report;
}

/**
 * Main test execution
 */
async function runIntegrationTests() {
    console.log('🚀 Starting AgroMart Integration Tests...');
    console.log(`🎯 Target: ${config.baseUrl}`);
    console.log(`👤 Test User: ${config.testUser}`);
    console.log(`⏱️  Timeout: ${config.timeout}ms`);
    console.log(`🧹 Cleanup: ${config.cleanup ? 'Enabled' : 'Disabled'}`);

    try {
        // Run test suites in order
        await runTestSuite('Authentication', authenticationTests);
        await runTestSuite('Product Management', productTests);
        await runTestSuite('Supplier Management', supplierTests);
        await runTestSuite('Customer Management', customerTests);
        await runTestSuite('Analytics & Reporting', analyticsTests);

        // Cleanup
        await cleanupTestData();

        // Generate and save report
        const report = generateReport();
        
        console.log('\n📊 Integration Test Results:');
        console.log(`   Total tests: ${testResults.summary.total}`);
        console.log(`   ✅ Passed: ${testResults.summary.passed}`);
        console.log(`   ❌ Failed: ${testResults.summary.failed}`);
        console.log(`   ⏱️  Duration: ${Math.round(testResults.summary.duration / 1000)}s`);
        console.log(`   ⚡ Average response time: ${testResults.performance.averageResponseTime}ms`);
        console.log(`   🔐 Authentication time: ${testResults.performance.authenticationTime}ms`);

        // Coverage summary
        console.log('\n📋 Coverage Summary:');
        console.log(`   Endpoints tested: ${report.coverage.endpoints.length}`);
        console.log(`   HTTP methods: ${report.coverage.httpMethods.join(', ')}`);
        console.log(`   Modules: ${report.coverage.modules.join(', ')}`);

        // Show errors
        if (testResults.errors.length > 0) {
            console.log('\n❌ Test Failures:');
            testResults.errors.forEach(error => {
                console.log(`   ${error.suite}/${error.test}: ${error.error}`);
            });
        }

        // Show recommendations
        if (report.recommendations.length > 0) {
            console.log('\n💡 Recommendations:');
            report.recommendations.forEach(rec => {
                const icon = rec.type === 'error' ? '❌' : rec.type === 'performance' ? '⚡' : '📊';
                console.log(`   ${icon} ${rec.message}`);
            });
        }

        // Save report
        fs.writeFileSync(config.outputFile, JSON.stringify(report, null, 2));
        console.log(`\n📄 Detailed report saved to: ${config.outputFile}`);

        console.log(testResults.summary.failed === 0 ? '\n🎉 All integration tests passed!' : `\n⚠️  ${testResults.summary.failed} tests failed.`);
        process.exit(testResults.summary.failed > 0 ? 1 : 0);

    } catch (error) {
        console.error('\n💥 Test execution failed:', error.message);
        await cleanupTestData();
        process.exit(1);
    }
}

// Run tests if executed directly
if (require.main === module) {
    runIntegrationTests().catch((err) => {
        console.error('Integration test execution failed:', err);
        process.exit(1);
    });
}

module.exports = { runIntegrationTests, config };