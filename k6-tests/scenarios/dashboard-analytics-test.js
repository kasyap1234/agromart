// k6-tests/scenarios/dashboard-analytics-test.js
// Dashboard and analytics data loading load testing scenario

import { check, sleep } from 'k6';
import { BASE_CONFIG, SCENARIOS } from '../configs/base-config.js';
import { httpUtils } from '../utils/http-utils.js';
import { authUtils } from '../utils/auth-utils.js';
import { generateTestUser } from '../utils/data-generators.js';

export const options = {
  scenarios: {
    dashboard_analytics_gradual_ramp: {
      ...BASE_CONFIG.SCENARIOS.GRADUAL_RAMP,
      tags: { test_type: 'dashboard_analytics_gradual_ramp' },
      exec: 'dashboardAnalyticsGradualRamp',
    },
    dashboard_analytics_sustained_load: {
      ...BASE_CONFIG.SCENARIOS.SUSTAINED_LOAD,
      tags: { test_type: 'dashboard_analytics_sustained_load' },
      exec: 'dashboardAnalyticsSustainedLoad',
    },
    dashboard_realistic_usage: {
      executor: 'constant-vus',
      vus: 100,
      duration: '15m',
      tags: { test_type: 'dashboard_realistic_usage' },
      exec: 'dashboardRealisticUsage',
    },
  },
  thresholds: {
    ...BASE_CONFIG.THRESHOLDS,
    dashboard_load_duration: ['p(95)<2500', 'p(99)<5000'],
    'dashboard_success_rate': ['rate>0.95'],
    'analytics_success_rate': ['rate>0.95'],
    'reports_success_rate': ['rate>0.95'],
  },
};

// Test data
let TEST_USERS = [];

// Dashboard and analytics endpoints to test
const DASHBOARD_ENDPOINTS = [
  '/reports/dashboard-stats',
  '/reports/inventory-value',
  '/reports/low-stock',
  '/reports/expiring-batches',
  '/analytics/sales-summary',
  '/analytics/inventory-turnover',
  '/analytics/customer-activity',
  '/analytics/supplier-performance',
];

const REPORT_ENDPOINTS = [
  '/reports/low-stock?threshold=10',
  '/reports/expiring-batches?days=30',
  '/reports/inventory-value',
  '/reports/sales-by-product',
  '/reports/customer-orders',
  '/reports/supplier-performance',
];

// Setup function
export function setup() {
  console.log('Setting up dashboard analytics test data...');

  // Generate test users for authentication
  for (let i = 0; i < 200; i++) {
    TEST_USERS.push(generateTestUser(i));
  }

  console.log(`Generated ${TEST_USERS.length} test users for dashboard analytics testing`);

  return { testUsers: TEST_USERS };
}

// Teardown function
export function teardown(data) {
  console.log('Cleaning up dashboard analytics test data...');
  authUtils.clearAllTokens();
}

// Gradual ramp dashboard analytics test
export async function dashboardAnalyticsGradualRamp(data) {
  const userIndex = __VU % data.testUsers.length;
  const user = data.testUsers[userIndex];

  // Authenticate first
  await authenticateUser(user);

  // Execute dashboard analytics workflow
  await executeDashboardAnalyticsWorkflow();
}

// Sustained load dashboard analytics test
export async function dashboardAnalyticsSustainedLoad(data) {
  const userIndex = __VU % data.testUsers.length;
  const user = data.testUsers[userIndex];

  // Authenticate first
  await authenticateUser(user);

  // Continuous dashboard and analytics operations
  const endTime = Date.now() + (25 * 60 * 1000); // 25 minutes

  while (Date.now() < endTime) {
    // Mix of dashboard and analytics operations
    const operationType = Math.random();

    if (operationType < 0.5) {
      // 50% - Dashboard operations
      await executeDashboardOperations();
    } else if (operationType < 0.8) {
      // 30% - Analytics operations
      await executeAnalyticsOperations();
    } else {
      // 20% - Report generation
      await executeReportOperations();
    }

    // Random delay between operations (1-5 seconds)
    sleep(1 + Math.random() * 4);
  }
}

// Realistic dashboard usage test
export async function dashboardRealisticUsage(data) {
  const userIndex = __VU % data.testUsers.length;
  const user = data.testUsers[userIndex];

  // Authenticate first
  await authenticateUser(user);

  // Simulate realistic dashboard usage patterns
  const sessionDuration = 10 + Math.random() * 20; // 10-30 minutes
  const endTime = Date.now() + (sessionDuration * 60 * 1000);

  while (Date.now() < endTime) {
    // Dashboard refresh pattern (every 30-60 seconds)
    await executeDashboardOperations();

    // Random delay before next dashboard refresh
    sleep(30 + Math.random() * 30);

    // Occasional deep analytics (20% chance)
    if (Math.random() < 0.2) {
      await executeAnalyticsOperations();
    }

    // Occasional report generation (10% chance)
    if (Math.random() < 0.1) {
      await executeReportOperations();
    }
  }
}

// Authenticate user
async function authenticateUser(user) {
  const loginResult = await authUtils.login(user.email, user.password, user.id);
  if (!loginResult.success) {
    console.error(`Authentication failed for user ${user.id}`);
    return false;
  }
  return true;
}

// Execute dashboard analytics workflow
async function executeDashboardAnalyticsWorkflow() {
  const startTime = Date.now();

  try {
    // Step 1: Load main dashboard statistics
    const dashboardResponse = httpUtils.get('/reports/dashboard-stats', {}, 'dashboard_load_duration');
    check(dashboardResponse, {
      'dashboard_stats_success': (r) => r.status === 200,
      'dashboard_stats_duration': (r) => r.timings.duration < BASE_CONFIG.TARGETS.RESPONSE_TIME_P95,
    });

    // Step 2: Load inventory value
    const inventoryResponse = httpUtils.get('/reports/inventory-value', {}, 'dashboard_load_duration');
    check(inventoryResponse, {
      'inventory_value_success': (r) => r.status === 200,
      'inventory_value_duration': (r) => r.timings.duration < BASE_CONFIG.TARGETS.RESPONSE_TIME_P95,
    });

    // Step 3: Load low stock report
    const lowStockResponse = httpUtils.get('/reports/low-stock', {}, 'dashboard_load_duration');
    check(lowStockResponse, {
      'low_stock_report_success': (r) => r.status === 200,
      'low_stock_report_duration': (r) => r.timings.duration < BASE_CONFIG.TARGETS.RESPONSE_TIME_P95,
    });

    // Step 4: Load expiring batches report
    const expiringResponse = httpUtils.get('/reports/expiring-batches', {}, 'dashboard_load_duration');
    check(expiringResponse, {
      'expiring_batches_success': (r) => r.status === 200,
      'expiring_batches_duration': (r) => r.timings.duration < BASE_CONFIG.TARGETS.RESPONSE_TIME_P95,
    });

    // Step 5: Load analytics data (if available)
    const analyticsEndpoints = [
      '/analytics/sales-summary',
      '/analytics/inventory-turnover',
      '/analytics/customer-activity',
    ];

    for (const endpoint of analyticsEndpoints) {
      try {
        const analyticsResponse = httpUtils.get(endpoint, {}, 'dashboard_load_duration');
        check(analyticsResponse, {
          [`analytics_${endpoint.split('/').pop()}_success`]: (r) => r.status === 200,
          [`analytics_${endpoint.split('/').pop()}_duration`]: (r) => r.timings.duration < 2500,
        });
      } catch (error) {
        // Analytics endpoints might not exist, continue
        console.log(`Analytics endpoint ${endpoint} not available`);
      }
    }

    const duration = Date.now() - startTime;
    console.log(`Dashboard analytics workflow completed in ${duration}ms`);

  } catch (error) {
    console.error('Dashboard analytics workflow failed:', error);
  }
}

// Execute dashboard operations
async function executeDashboardOperations() {
  // Random dashboard endpoint selection
  const endpoint = DASHBOARD_ENDPOINTS[Math.floor(Math.random() * DASHBOARD_ENDPOINTS.length)];

  // Add some query parameters for more realistic testing
  const params = generateDashboardParams(endpoint);

  const dashboardResponse = httpUtils.get(`${endpoint}${params}`, {}, 'dashboard_load_duration');

  check(dashboardResponse, {
    'dashboard_endpoint_success': (r) => r.status === 200,
    'dashboard_endpoint_duration': (r) => r.timings.duration < BASE_CONFIG.TARGETS.RESPONSE_TIME_P95,
  });

  if (dashboardResponse.status !== 200) {
    console.error(`Dashboard endpoint ${endpoint} failed: ${dashboardResponse.status}`);
  }
}

// Execute analytics operations
async function executeAnalyticsOperations() {
  const analyticsOperations = [
    { endpoint: '/analytics/sales-summary', params: '?period=30' },
    { endpoint: '/analytics/inventory-turnover', params: '?period=90' },
    { endpoint: '/analytics/customer-activity', params: '?period=7' },
    { endpoint: '/analytics/supplier-performance', params: '?period=30' },
  ];

  // Execute 2-4 analytics operations
  const operationCount = 2 + Math.floor(Math.random() * 3);
  const selectedOperations = shuffleArray(analyticsOperations).slice(0, operationCount);

  for (const operation of selectedOperations) {
    try {
      const analyticsResponse = httpUtils.get(`${operation.endpoint}${operation.params}`, {}, 'dashboard_load_duration');
      check(analyticsResponse, {
        'analytics_operation_success': (r) => r.status === 200,
        'analytics_operation_duration': (r) => r.timings.duration < 2500,
      });
    } catch (error) {
      // Analytics endpoints might not be available
    }
  }
}

// Execute report operations
async function executeReportOperations() {
  const reportOperation = REPORT_ENDPOINTS[Math.floor(Math.random() * REPORT_ENDPOINTS.length)];
  const params = generateReportParams(reportOperation);

  const reportResponse = httpUtils.get(`${reportOperation}${params}`, {}, 'dashboard_load_duration');

  check(reportResponse, {
    'report_generation_success': (r) => r.status === 200,
    'report_generation_duration': (r) => r.timings.duration < 3000, // Reports can take longer
  });

  if (reportResponse.status !== 200) {
    console.error(`Report generation failed for ${reportOperation}: ${reportResponse.status}`);
  }
}

// Helper functions
function generateDashboardParams(endpoint) {
  const params = [];

  // Add common dashboard parameters
  if (endpoint.includes('low-stock')) {
    params.push(`threshold=${10 + Math.floor(Math.random() * 20)}`);
  }

  if (endpoint.includes('expiring-batches')) {
    params.push(`days=${7 + Math.floor(Math.random() * 30)}`);
  }

  if (endpoint.includes('period') || endpoint.includes('analytics')) {
    const periods = [7, 30, 90, 180, 365];
    params.push(`period=${periods[Math.floor(Math.random() * periods.length)]}`);
  }

  return params.length > 0 ? `?${params.join('&')}` : '';
}

function generateReportParams(endpoint) {
  const params = [];

  // Add report-specific parameters
  if (endpoint.includes('low-stock')) {
    params.push(`threshold=${5 + Math.floor(Math.random() * 25)}`);
  }

  if (endpoint.includes('expiring-batches')) {
    params.push(`days=${14 + Math.floor(Math.random() * 60)}`);
  }

  if (endpoint.includes('period') || endpoint.includes('date')) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (30 + Math.floor(Math.random() * 60)));
    const endDate = new Date();

    params.push(`start_date=${startDate.toISOString().split('T')[0]}`);
    params.push(`end_date=${endDate.toISOString().split('T')[0]}`);
  }

  return params.length > 0 ? `?${params.join('&')}` : '';
}

function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Handle summary for detailed reporting
export function handleSummary(data) {
  const summary = {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'reports/dashboard-analytics-summary.json': JSON.stringify(data, null, 2),
    'reports/dashboard-analytics-report.html': htmlReport(data),
  };

  // Custom summary metrics
  if (data.metrics) {
    const dashboardMetrics = {
      total_requests: data.metrics.http_reqs?.values.count || 0,
      failed_requests: data.metrics.http_req_failed?.values.rate || 0,
      avg_response_time: data.metrics.http_req_duration?.values.avg || 0,
      p95_response_time: data.metrics.http_req_duration?.values['p(95)'] || 0,
      p99_response_time: data.metrics.http_req_duration?.values['p(99)'] || 0,
      dashboard_load_duration_p95: data.metrics.dashboard_load_duration?.values['p(95)'] || 0,
      dashboard_success_rate: data.metrics.dashboard_success_rate?.values.rate || 0,
      analytics_success_rate: data.metrics.analytics_success_rate?.values.rate || 0,
      reports_success_rate: data.metrics.reports_success_rate?.values.rate || 0,
    };

    summary['reports/dashboard-analytics-metrics.json'] = JSON.stringify(dashboardMetrics, null, 2);
  }

  return summary;
}