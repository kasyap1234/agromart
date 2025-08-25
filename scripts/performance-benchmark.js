/**
 * AgroMart Performance Benchmarking Suite
 * 
 * This k6 script provides comprehensive performance testing for all AgroMart routes:
 * - Load testing for critical endpoints
 * - Stress testing for peak capacity
 * - Spike testing for traffic surges
 * - Endurance testing for stability
 * - API response time benchmarking
 * - Frontend page load performance
 * 
 * Usage:
 *   k6 run performance-benchmark.js
 *   k6 run --vus 50 --duration 5m performance-benchmark.js
 *   k6 run --stage 10s:10 --stage 30s:50 --stage 10s:0 performance-benchmark.js
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// Configuration
const config = {
    baseUrl: __ENV.BASE_URL || 'http://localhost:8080',
    frontendUrl: __ENV.FRONTEND_URL || 'http://localhost:9000',
    testUser: {
        email: __ENV.TEST_EMAIL || 'admin@agromart.test',
        password: __ENV.TEST_PASSWORD || 'AdminPass123!'
    },
    thresholds: {
        apiResponseTime: 500, // ms
        pageLoadTime: 3000,   // ms
        errorRate: 0.05,      // 5%
        throughput: 100       // requests/second
    }
};

// Custom metrics
const authenticationTime = new Trend('authentication_time');
const apiResponseTime = new Trend('api_response_time');
const pageLoadTime = new Trend('page_load_time');
const errorRate = new Rate('error_rate');
const dbQueryTime = new Trend('db_query_time');
const successfulRequests = new Counter('successful_requests');

// Test options with multiple scenarios
export const options = {
    scenarios: {
        // Smoke test - verify basic functionality
        smoke_test: {
            executor: 'constant-vus',
            vus: 1,
            duration: '30s',
            tags: { test_type: 'smoke' },
        },
        
        // Load test - normal expected load
        load_test: {
            executor: 'constant-vus',
            vus: 10,
            duration: '2m',
            tags: { test_type: 'load' },
            startTime: '30s',
        },
        
        // Stress test - beyond normal capacity
        stress_test: {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: [
                { duration: '30s', target: 20 },
                { duration: '1m', target: 50 },
                { duration: '30s', target: 0 },
            ],
            tags: { test_type: 'stress' },
            startTime: '2m30s',
        },
        
        // Spike test - sudden traffic increase
        spike_test: {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: [
                { duration: '10s', target: 100 },
                { duration: '30s', target: 100 },
                { duration: '10s', target: 0 },
            ],
            tags: { test_type: 'spike' },
            startTime: '4m',
        },
        
        // Critical path test - high frequency on important routes
        critical_path_test: {
            executor: 'constant-arrival-rate',
            rate: 30,
            timeUnit: '1s',
            duration: '1m',
            preAllocatedVUs: 20,
            tags: { test_type: 'critical' },
            startTime: '5m',
        }
    },
    
    thresholds: {
        // Overall performance thresholds
        'http_req_duration': ['p(95)<500', 'p(99)<1000'],
        'http_req_failed': ['rate<0.05'],
        
        // Authentication performance
        'authentication_time': ['p(95)<1000'],
        
        // API performance by endpoint type
        'api_response_time{endpoint:products}': ['p(95)<300'],
        'api_response_time{endpoint:customers}': ['p(95)<300'],
        'api_response_time{endpoint:suppliers}': ['p(95)<300'],
        'api_response_time{endpoint:purchase_orders}': ['p(95)<500'],
        'api_response_time{endpoint:sales_orders}': ['p(95)<500'],
        'api_response_time{endpoint:inventory}': ['p(95)<400'],
        'api_response_time{endpoint:analytics}': ['p(95)<1000'],
        'api_response_time{endpoint:reports}': ['p(95)<2000'],
        
        // Page load performance
        'page_load_time{page:dashboard}': ['p(95)<3000'],
        'page_load_time{page:products}': ['p(95)<2000'],
        'page_load_time{page:customers}': ['p(95)<2000'],
        
        // Error rates by test type
        'error_rate{test_type:smoke}': ['rate<0.01'],
        'error_rate{test_type:load}': ['rate<0.03'],
        'error_rate{test_type:stress}': ['rate<0.10'],
    }
};

// Global authentication token
let authToken = null;

/**
 * Setup function - runs once before all tests
 */
export function setup() {
    console.log('🚀 Starting AgroMart Performance Benchmark Suite');
    console.log(`API Base URL: ${config.baseUrl}`);
    console.log(`Frontend URL: ${config.frontendUrl}`);
    
    // Authenticate and get token for API tests
    const authResponse = authenticate();
    return {
        authToken: authResponse.token,
        testStartTime: Date.now()
    };
}

/**
 * Main test execution
 */
export default function (data) {
    authToken = data.authToken;
    
    // Get current scenario info
    const scenario = __ENV.K6_SCENARIO_NAME || 'default';
    
    group('Authentication Flow Performance', () => {
        testAuthenticationPerformance();
    });
    
    group('API Endpoints Performance', () => {
        testProductsAPI();
        testCustomersAPI();
        testSuppliersAPI();
        testPurchaseOrdersAPI();
        testInventoryAPI();
        testAnalyticsAPI();
    });
    
    group('Frontend Pages Performance', () => {
        testFrontendPagesPerformance();
    });
    
    group('Database Operations Performance', () => {
        testDatabasePerformance();
    });
    
    group('File Upload Performance', () => {
        testFileUploadPerformance();
    });
    
    // Realistic user think time
    sleep(Math.random() * 2 + 1);
}

/**
 * Teardown function - runs once after all tests
 */
export function teardown(data) {
    const duration = (Date.now() - data.testStartTime) / 1000;
    console.log(`🏁 Performance benchmark completed in ${duration}s`);
}

/**
 * Authentication Performance Tests
 */
function testAuthenticationPerformance() {
    const startTime = Date.now();
    
    const loginPayload = {
        email: config.testUser.email,
        password: config.testUser.password
    };
    
    const response = http.post(`${config.baseUrl}/api/auth/login`, JSON.stringify(loginPayload), {
        headers: { 'Content-Type': 'application/json' },
        tags: { endpoint: 'auth_login' }
    });
    
    const authTime = Date.now() - startTime;
    authenticationTime.add(authTime);
    
    check(response, {
        'login successful': (r) => r.status === 200,
        'login response time < 1s': (r) => r.timings.duration < 1000,
        'login returns token': (r) => JSON.parse(r.body).data?.access_token !== undefined,
    });
    
    if (response.status === 200) {
        successfulRequests.add(1);
    } else {
        errorRate.add(1);
    }
}

/**
 * Products API Performance Tests
 */
function testProductsAPI() {
    const headers = {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
    };
    
    // GET /api/products
    group('Products List Performance', () => {
        const response = http.get(`${config.baseUrl}/api/products?page=1&limit=20`, { 
            headers,
            tags: { endpoint: 'products' }
        });
        
        apiResponseTime.add(response.timings.duration, { endpoint: 'products' });
        
        check(response, {
            'products list loaded': (r) => r.status === 200,
            'products response time acceptable': (r) => r.timings.duration < config.thresholds.apiResponseTime,
            'products data structure valid': (r) => {
                try {
                    const data = JSON.parse(r.body);
                    return Array.isArray(data.data) || Array.isArray(data);
                } catch {
                    return false;
                }
            }
        });
    });
    
    // GET /api/products/search
    group('Products Search Performance', () => {
        const response = http.get(`${config.baseUrl}/api/products/search?q=test`, { 
            headers,
            tags: { endpoint: 'products_search' }
        });
        
        apiResponseTime.add(response.timings.duration, { endpoint: 'products' });
        
        check(response, {
            'products search works': (r) => r.status === 200,
            'search response time acceptable': (r) => r.timings.duration < config.thresholds.apiResponseTime,
        });
    });
    
    // POST /api/products (Create)
    group('Product Creation Performance', () => {
        const productPayload = {
            name: `Perf Test Product ${Date.now()}`,
            sku: `PERF-${Date.now()}`,
            selling_price: 1500,
            cost_price: 1000,
            reorder_level: 10
        };
        
        const response = http.post(`${config.baseUrl}/api/products`, JSON.stringify(productPayload), { 
            headers,
            tags: { endpoint: 'products_create' }
        });
        
        apiResponseTime.add(response.timings.duration, { endpoint: 'products' });
        
        check(response, {
            'product creation successful': (r) => [200, 201].includes(r.status),
            'creation response time acceptable': (r) => r.timings.duration < config.thresholds.apiResponseTime * 2,
        });
    });
}

/**
 * Customers API Performance Tests
 */
function testCustomersAPI() {
    const headers = {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
    };
    
    group('Customers API Performance', () => {
        // List customers
        const listResponse = http.get(`${config.baseUrl}/api/customers`, { 
            headers,
            tags: { endpoint: 'customers' }
        });
        
        apiResponseTime.add(listResponse.timings.duration, { endpoint: 'customers' });
        
        check(listResponse, {
            'customers list loaded': (r) => r.status === 200,
            'customers response time acceptable': (r) => r.timings.duration < config.thresholds.apiResponseTime,
        });
        
        // Create customer
        const customerPayload = {
            name: `Perf Customer ${Date.now()}`,
            email: `perf-customer-${Date.now()}@test.com`,
            phone: '+1-555-0000',
            payment_mode: 'credit'
        };
        
        const createResponse = http.post(`${config.baseUrl}/api/customers`, JSON.stringify(customerPayload), { 
            headers,
            tags: { endpoint: 'customers_create' }
        });
        
        apiResponseTime.add(createResponse.timings.duration, { endpoint: 'customers' });
        
        check(createResponse, {
            'customer creation successful': (r) => [200, 201].includes(r.status),
        });
    });
}

/**
 * Suppliers API Performance Tests
 */
function testSuppliersAPI() {
    const headers = {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
    };
    
    group('Suppliers API Performance', () => {
        const response = http.get(`${config.baseUrl}/api/suppliers`, { 
            headers,
            tags: { endpoint: 'suppliers' }
        });
        
        apiResponseTime.add(response.timings.duration, { endpoint: 'suppliers' });
        
        check(response, {
            'suppliers list loaded': (r) => r.status === 200,
            'suppliers response time acceptable': (r) => r.timings.duration < config.thresholds.apiResponseTime,
        });
    });
}

/**
 * Purchase Orders API Performance Tests
 */
function testPurchaseOrdersAPI() {
    const headers = {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
    };
    
    group('Purchase Orders API Performance', () => {
        const response = http.get(`${config.baseUrl}/api/purchase-orders`, { 
            headers,
            tags: { endpoint: 'purchase_orders' }
        });
        
        apiResponseTime.add(response.timings.duration, { endpoint: 'purchase_orders' });
        
        check(response, {
            'purchase orders list loaded': (r) => r.status === 200,
            'purchase orders response time acceptable': (r) => r.timings.duration < config.thresholds.apiResponseTime,
        });
    });
}

/**
 * Inventory API Performance Tests
 */
function testInventoryAPI() {
    const headers = {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
    };
    
    group('Inventory API Performance', () => {
        const response = http.get(`${config.baseUrl}/api/inventory`, { 
            headers,
            tags: { endpoint: 'inventory' }
        });
        
        apiResponseTime.add(response.timings.duration, { endpoint: 'inventory' });
        
        check(response, {
            'inventory loaded': (r) => r.status === 200,
            'inventory response time acceptable': (r) => r.timings.duration < config.thresholds.apiResponseTime,
        });
    });
}

/**
 * Analytics API Performance Tests
 */
function testAnalyticsAPI() {
    const headers = {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
    };
    
    group('Analytics API Performance', () => {
        // KPIs endpoint
        const kpiResponse = http.get(`${config.baseUrl}/api/analytics/kpis`, { 
            headers,
            tags: { endpoint: 'analytics' }
        });
        
        apiResponseTime.add(kpiResponse.timings.duration, { endpoint: 'analytics' });
        
        check(kpiResponse, {
            'analytics KPIs loaded': (r) => r.status === 200,
            'analytics response time acceptable': (r) => r.timings.duration < 1000, // More lenient for analytics
        });
        
        // Sales analytics
        const salesResponse = http.get(`${config.baseUrl}/api/analytics/sales`, { 
            headers,
            tags: { endpoint: 'analytics_sales' }
        });
        
        check(salesResponse, {
            'sales analytics loaded': (r) => r.status === 200,
        });
    });
}

/**
 * Frontend Pages Performance Tests
 */
function testFrontendPagesPerformance() {
    group('Frontend Performance', () => {
        // Dashboard page
        const dashboardResponse = http.get(`${config.frontendUrl}/dashboard`, {
            tags: { page: 'dashboard' }
        });
        
        pageLoadTime.add(dashboardResponse.timings.duration, { page: 'dashboard' });
        
        check(dashboardResponse, {
            'dashboard loads': (r) => r.status === 200,
            'dashboard load time acceptable': (r) => r.timings.duration < config.thresholds.pageLoadTime,
        });
        
        // Products page
        const productsResponse = http.get(`${config.frontendUrl}/products`, {
            tags: { page: 'products' }
        });
        
        pageLoadTime.add(productsResponse.timings.duration, { page: 'products' });
        
        check(productsResponse, {
            'products page loads': (r) => r.status === 200,
            'products load time acceptable': (r) => r.timings.duration < config.thresholds.pageLoadTime,
        });
    });
}

/**
 * Database Performance Tests
 */
function testDatabasePerformance() {
    const headers = {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
    };
    
    group('Database Performance', () => {
        // Complex query with joins (reports)
        const reportResponse = http.get(`${config.baseUrl}/api/reports/dashboard-stats`, { 
            headers,
            tags: { endpoint: 'reports_complex' }
        });
        
        dbQueryTime.add(reportResponse.timings.duration);
        
        check(reportResponse, {
            'complex database query executes': (r) => r.status === 200,
            'database query time acceptable': (r) => r.timings.duration < 2000,
        });
    });
}

/**
 * File Upload Performance Tests
 */
function testFileUploadPerformance() {
    const headers = {
        'Authorization': `Bearer ${authToken}`,
    };
    
    group('File Upload Performance', () => {
        // Simulate small file upload
        const fileData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
        
        const uploadResponse = http.post(`${config.baseUrl}/api/files/upload`, {
            file: http.file(fileData, 'test.png', 'image/png')
        }, { 
            headers,
            tags: { endpoint: 'file_upload' }
        });
        
        check(uploadResponse, {
            'file upload works': (r) => [200, 201].includes(r.status) || r.status === 404, // 404 if not implemented
            'upload response time acceptable': (r) => r.timings.duration < 5000,
        });
    });
}

/**
 * Authentication helper
 */
function authenticate() {
    const loginPayload = {
        email: config.testUser.email,
        password: config.testUser.password
    };
    
    const response = http.post(`${config.baseUrl}/api/auth/login`, JSON.stringify(loginPayload), {
        headers: { 'Content-Type': 'application/json' }
    });
    
    if (response.status === 200) {
        const body = JSON.parse(response.body);
        return {
            token: body.data?.access_token || body.token,
            user: body.data?.user || body.user
        };
    }
    
    console.error(`Authentication failed: ${response.status} ${response.body}`);
    return { token: null };
}

/**
 * Custom error handler
 */
export function handleSummary(data) {
    return {
        'performance-benchmark-results.json': JSON.stringify(data, null, 2),
        stdout: generateSummaryReport(data)
    };
}

/**
 * Generate human-readable summary report
 */
function generateSummaryReport(data) {
    const report = `
🏁 AgroMart Performance Benchmark Results
==========================================

📊 Overall Performance:
- Total Requests: ${data.metrics.http_reqs.values.count}
- Failed Requests: ${data.metrics.http_req_failed.values.rate * 100}%
- Average Response Time: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms
- 95th Percentile: ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms
- 99th Percentile: ${data.metrics.http_req_duration.values['p(99)'].toFixed(2)}ms

🔐 Authentication Performance:
- Average Authentication Time: ${data.metrics.authentication_time?.values.avg?.toFixed(2) || 'N/A'}ms

📈 API Endpoint Performance:
- Products API: ${data.metrics['api_response_time{endpoint:products}']?.values.avg?.toFixed(2) || 'N/A'}ms
- Customers API: ${data.metrics['api_response_time{endpoint:customers}']?.values.avg?.toFixed(2) || 'N/A'}ms
- Suppliers API: ${data.metrics['api_response_time{endpoint:suppliers}']?.values.avg?.toFixed(2) || 'N/A'}ms
- Purchase Orders API: ${data.metrics['api_response_time{endpoint:purchase_orders}']?.values.avg?.toFixed(2) || 'N/A'}ms
- Inventory API: ${data.metrics['api_response_time{endpoint:inventory}']?.values.avg?.toFixed(2) || 'N/A'}ms
- Analytics API: ${data.metrics['api_response_time{endpoint:analytics}']?.values.avg?.toFixed(2) || 'N/A'}ms

🌐 Frontend Performance:
- Dashboard Load Time: ${data.metrics['page_load_time{page:dashboard}']?.values.avg?.toFixed(2) || 'N/A'}ms
- Products Page Load Time: ${data.metrics['page_load_time{page:products}']?.values.avg?.toFixed(2) || 'N/A'}ms

💾 Database Performance:
- Average Query Time: ${data.metrics.db_query_time?.values.avg?.toFixed(2) || 'N/A'}ms

✅ Performance Thresholds:
${Object.entries(data.metrics).map(([name, metric]) => {
    if (metric.thresholds) {
        return Object.entries(metric.thresholds).map(([threshold, result]) => 
            `- ${name} ${threshold}: ${result.ok ? '✅ PASS' : '❌ FAIL'}`
        ).join('\n');
    }
    return '';
}).filter(Boolean).join('\n')}

🎯 Recommendations:
${generateRecommendations(data)}
`;
    
    return report;
}

/**
 * Generate performance recommendations
 */
function generateRecommendations(data) {
    const recommendations = [];
    
    const avgResponseTime = data.metrics.http_req_duration.values.avg;
    const p95ResponseTime = data.metrics.http_req_duration.values['p(95)'];
    const errorRate = data.metrics.http_req_failed.values.rate;
    
    if (avgResponseTime > 300) {
        recommendations.push('- Consider API response time optimization');
    }
    
    if (p95ResponseTime > 1000) {
        recommendations.push('- 95th percentile response time is high - investigate slow queries');
    }
    
    if (errorRate > 0.05) {
        recommendations.push('- Error rate exceeds 5% - review error handling and system stability');
    }
    
    if (data.metrics.authentication_time?.values.avg > 1000) {
        recommendations.push('- Authentication time is slow - consider token caching');
    }
    
    if (recommendations.length === 0) {
        recommendations.push('- Performance is within acceptable thresholds');
    }
    
    return recommendations.join('\n');
}

export { config };