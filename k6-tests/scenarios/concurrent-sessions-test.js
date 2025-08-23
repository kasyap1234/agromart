// k6-tests/scenarios/concurrent-sessions-test.js
// Concurrent user session handling and database connection pool testing scenario

import { check, sleep } from 'k6';
import { BASE_CONFIG, SCENARIOS } from '../configs/base-config.js';
import { httpUtils } from '../utils/http-utils.js';
import { authUtils } from '../utils/auth-utils.js';
import { generateTestUser, generateTestProduct, generateTestCustomer, generateTestSupplier } from '../utils/data-generators.js';

export const options = {
  scenarios: {
    concurrent_sessions_gradual_ramp: {
      ...BASE_CONFIG.SCENARIOS.GRADUAL_RAMP,
      tags: { test_type: 'concurrent_sessions_gradual_ramp' },
      exec: 'concurrentSessionsGradualRamp',
    },
    concurrent_sessions_stress_test: {
      ...BASE_CONFIG.SCENARIOS.STRESS_TEST,
      tags: { test_type: 'concurrent_sessions_stress_test' },
      exec: 'concurrentSessionsStressTest',
    },
    database_connection_pool_test: {
      executor: 'ramping-vus',
      stages: [
        { duration: '2m', target: 200 },
        { duration: '5m', target: 500 },
        { duration: '10m', target: 1000 },
        { duration: '5m', target: 500 },
        { duration: '2m', target: 200 },
      ],
      tags: { test_type: 'database_connection_pool_test' },
      exec: 'databaseConnectionPoolTest',
    },
  },
  thresholds: {
    ...BASE_CONFIG.THRESHOLDS,
    'session_success_rate': ['rate>0.95'],
    'concurrent_db_success_rate': ['rate>0.90'],
    'connection_pool_efficiency': ['rate>0.95'],
  },
};

// Test data
let TEST_USERS = [];
let ACTIVE_SESSIONS = new Map();

// Setup function
export function setup() {
  console.log('Setting up concurrent sessions test data...');

  // Generate test users for concurrent session testing
  for (let i = 0; i < BASE_CONFIG.TEST_DATA.USERS_COUNT; i++) {
    TEST_USERS.push(generateTestUser(i));
  }

  console.log(`Generated ${TEST_USERS.length} test users for concurrent sessions testing`);

  return { testUsers: TEST_USERS };
}

// Teardown function
export function teardown(data) {
  console.log('Cleaning up concurrent sessions test data...');
  console.log(`Active sessions during test: ${ACTIVE_SESSIONS.size}`);

  authUtils.clearAllTokens();
  ACTIVE_SESSIONS.clear();
}

// Gradual ramp concurrent sessions test
export async function concurrentSessionsGradualRamp(data) {
  const userIndex = __VU % data.testUsers.length;
  const user = data.testUsers[userIndex];

  // Execute concurrent session workflow
  await executeConcurrentSessionWorkflow(user);
}

// Stress test for concurrent sessions
export async function concurrentSessionsStressTest(data) {
  const userIndex = __VU % data.testUsers.length;
  const user = data.testUsers[userIndex];

  // Execute stress test workflow
  await executeStressTestWorkflow(user);
}

// Database connection pool test
export async function databaseConnectionPoolTest(data) {
  const userIndex = __VU % data.testUsers.length;
  const user = data.testUsers[userIndex];

  // Execute database connection pool stress workflow
  await executeDatabasePoolWorkflow(user);
}

// Execute concurrent session workflow
async function executeConcurrentSessionWorkflow(user) {
  const startTime = Date.now();

  try {
    // Step 1: Initial login
    const loginResult = await authUtils.login(user.email, user.password, user.id);
    check(loginResult, {
      'concurrent_login_success': (r) => r.success === true,
      'concurrent_login_token_received': (r) => r.token && r.token.length > 0,
    });

    if (!loginResult.success) {
      console.error(`Concurrent login failed for user ${user.id}`);
      return;
    }

    // Track active session
    ACTIVE_SESSIONS.set(user.id, {
      loginTime: Date.now(),
      token: loginResult.token,
      lastActivity: Date.now(),
    });

    // Step 2: Simulate concurrent user activities
    const activities = [
      { action: 'view_profile', weight: 0.3 },
      { action: 'list_products', weight: 0.2 },
      { action: 'search_products', weight: 0.15 },
      { action: 'view_dashboard', weight: 0.15 },
      { action: 'list_customers', weight: 0.1 },
      { action: 'list_suppliers', weight: 0.1 },
    ];

    // Execute multiple concurrent activities
    const concurrentActivities = 3 + Math.floor(Math.random() * 3); // 3-5 concurrent activities
    const activityPromises = [];

    for (let i = 0; i < concurrentActivities; i++) {
      const activity = selectWeightedRandom(activities);
      activityPromises.push(executeConcurrentActivity(user.id, activity.action));
    }

    // Wait for all activities to complete
    await Promise.allSettled(activityPromises);

    // Step 3: Token refresh during concurrent operations
    sleep(1); // Simulate some time passing

    const refreshResult = await authUtils.refreshToken(loginResult.refreshToken, user.id);
    check(refreshResult, {
      'concurrent_token_refresh_success': (r) => r.success === true,
      'concurrent_refresh_token_received': (r) => r.token && r.token.length > 0,
    });

    if (refreshResult.success) {
      // Update session with new token
      const session = ACTIVE_SESSIONS.get(user.id);
      if (session) {
        session.token = refreshResult.token;
        session.lastActivity = Date.now();
      }
    }

    // Step 4: Logout
    const logoutSuccess = await authUtils.logout(user.id);
    check(logoutSuccess, {
      'concurrent_logout_success': (r) => r === true,
    });

    // Remove from active sessions
    ACTIVE_SESSIONS.delete(user.id);

    const duration = Date.now() - startTime;
    console.log(`Concurrent session workflow completed in ${duration}ms for user ${user.id}`);

  } catch (error) {
    console.error(`Concurrent session workflow failed for user ${user.id}:`, error);
  }
}

// Execute stress test workflow
async function executeStressTestWorkflow(user) {
  // Rapid login-logout cycles under stress
  for (let cycle = 0; cycle < 5; cycle++) {
    const loginResult = await authUtils.login(user.email, user.password, user.id);
    check(loginResult, {
      'stress_login_success': (r) => r.success === true,
    });

    if (loginResult.success) {
      // Quick activity
      const profileResponse = await authUtils.getUserProfile();
      check(profileResponse, {
        'stress_profile_success': (r) => r.status === 200,
      });

      // Immediate logout
      await authUtils.logout(user.id);
    }

    // Very short delay between cycles
    sleep(0.1);
  }
}

// Execute database connection pool workflow
async function executeDatabasePoolWorkflow(user) {
  // Login first
  const loginResult = await authUtils.login(user.email, user.password, user.id);
  if (!loginResult.success) {
    return;
  }

  // Execute database-intensive operations concurrently
  const dbOperations = [
    { action: 'list_products_paginated', weight: 0.25 },
    { action: 'search_products_multiple', weight: 0.20 },
    { action: 'list_customers_paginated', weight: 0.15 },
    { action: 'list_suppliers_paginated', weight: 0.15 },
    { action: 'dashboard_stats', weight: 0.10 },
    { action: 'reports_generation', weight: 0.10 },
    { action: 'bulk_operations', weight: 0.05 },
  ];

  // Execute multiple database operations concurrently
  const concurrentOperations = 4 + Math.floor(Math.random() * 4); // 4-7 concurrent operations
  const operationPromises = [];

  for (let i = 0; i < concurrentOperations; i++) {
    const operation = selectWeightedRandom(dbOperations);
    operationPromises.push(executeDatabaseOperation(user.id, operation.action));
  }

  // Wait for all operations to complete
  const results = await Promise.allSettled(operationPromises);

  // Check results
  const successfulOperations = results.filter(r => r.status === 'fulfilled').length;
  const totalOperations = results.length;

  check({ successfulOperations, totalOperations }, {
    'database_pool_operations_success': (r) => r.successfulOperations / r.totalOperations > 0.9,
  });

  // Logout
  await authUtils.logout(user.id);
}

// Execute concurrent activity
async function executeConcurrentActivity(userId, action) {
  const session = ACTIVE_SESSIONS.get(userId);
  if (!session) return;

  // Set the user's token
  httpUtils.setAuthToken(session.token);

  try {
    switch (action) {
      case 'view_profile':
        const profileResponse = await authUtils.getUserProfile();
        check(profileResponse, {
          'concurrent_profile_success': (r) => r.status === 200,
        });
        break;

      case 'list_products':
        const productsResponse = httpUtils.get('/products?page=1&limit=20', {}, 'database_query_duration');
        check(productsResponse, {
          'concurrent_products_success': (r) => r.status === 200,
        });
        break;

      case 'search_products':
        const searchResponse = httpUtils.get('/products/search?q=organic', {}, 'database_query_duration');
        check(searchResponse, {
          'concurrent_search_success': (r) => r.status === 200,
        });
        break;

      case 'view_dashboard':
        const dashboardResponse = httpUtils.get('/reports/dashboard-stats', {}, 'database_query_duration');
        check(dashboardResponse, {
          'concurrent_dashboard_success': (r) => r.status === 200,
        });
        break;

      case 'list_customers':
        const customersResponse = httpUtils.get('/customers?page=1&limit=10', {}, 'database_query_duration');
        check(customersResponse, {
          'concurrent_customers_success': (r) => r.status === 200,
        });
        break;

      case 'list_suppliers':
        const suppliersResponse = httpUtils.get('/suppliers?page=1&limit=10', {}, 'database_query_duration');
        check(suppliersResponse, {
          'concurrent_suppliers_success': (r) => r.status === 200,
        });
        break;
    }

    // Update last activity
    session.lastActivity = Date.now();

  } catch (error) {
    console.error(`Concurrent activity ${action} failed for user ${userId}:`, error);
  }
}

// Execute database operation
async function executeDatabaseOperation(userId, action) {
  const session = ACTIVE_SESSIONS.get(userId);
  if (!session) return;

  // Set the user's token
  httpUtils.setAuthToken(session.token);

  try {
    switch (action) {
      case 'list_products_paginated':
        for (let page = 1; page <= 5; page++) {
          const response = httpUtils.get(`/products?page=${page}&limit=50`, {}, 'database_query_duration');
          check(response, {
            'db_pool_products_success': (r) => r.status === 200,
          });
        }
        break;

      case 'search_products_multiple':
        const searchTerms = ['organic', 'fresh', 'premium', 'bulk', 'imported'];
        for (const term of searchTerms) {
          const response = httpUtils.get(`/products/search?q=${term}`, {}, 'database_query_duration');
          check(response, {
            'db_pool_search_success': (r) => r.status === 200,
          });
        }
        break;

      case 'list_customers_paginated':
        for (let page = 1; page <= 3; page++) {
          const response = httpUtils.get(`/customers?page=${page}&limit=25`, {}, 'database_query_duration');
          check(response, {
            'db_pool_customers_success': (r) => r.status === 200,
          });
        }
        break;

      case 'list_suppliers_paginated':
        for (let page = 1; page <= 3; page++) {
          const response = httpUtils.get(`/suppliers?page=${page}&limit=25`, {}, 'database_query_duration');
          check(response, {
            'db_pool_suppliers_success': (r) => r.status === 200,
          });
        }
        break;

      case 'dashboard_stats':
        const dashboardEndpoints = [
          '/reports/dashboard-stats',
          '/reports/inventory-value',
          '/reports/low-stock',
          '/reports/expiring-batches',
        ];
        for (const endpoint of dashboardEndpoints) {
          const response = httpUtils.get(endpoint, {}, 'database_query_duration');
          check(response, {
            'db_pool_dashboard_success': (r) => r.status === 200,
          });
        }
        break;

      case 'reports_generation':
        const reportEndpoints = [
          '/reports/low-stock?threshold=15',
          '/reports/expiring-batches?days=45',
        ];
        for (const endpoint of reportEndpoints) {
          const response = httpUtils.get(endpoint, {}, 'database_query_duration');
          check(response, {
            'db_pool_reports_success': (r) => r.status === 200,
          });
        }
        break;

      case 'bulk_operations':
        // Simulate bulk data operations
        const bulkResponse = httpUtils.get('/products?page=1&limit=100', {}, 'database_query_duration');
        check(bulkResponse, {
          'db_pool_bulk_success': (r) => r.status === 200,
        });
        break;
    }

  } catch (error) {
    console.error(`Database operation ${action} failed for user ${userId}:`, error);
    throw error;
  }
}

// Helper function to select weighted random item
function selectWeightedRandom(items) {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  let random = Math.random() * totalWeight;

  for (const item of items) {
    random -= item.weight;
    if (random <= 0) {
      return item;
    }
  }

  return items[0]; // fallback
}

// Handle summary for detailed reporting
export function handleSummary(data) {
  const summary = {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'reports/concurrent-sessions-summary.json': JSON.stringify(data, null, 2),
    'reports/concurrent-sessions-report.html': htmlReport(data),
  };

  // Custom summary metrics
  if (data.metrics) {
    const sessionMetrics = {
      total_requests: data.metrics.http_reqs?.values.count || 0,
      failed_requests: data.metrics.http_req_failed?.values.rate || 0,
      avg_response_time: data.metrics.http_req_duration?.values.avg || 0,
      p95_response_time: data.metrics.http_req_duration?.values['p(95)'] || 0,
      p99_response_time: data.metrics.http_req_duration?.values['p(99)'] || 0,
      database_query_duration_p95: data.metrics.database_query_duration?.values['p(95)'] || 0,
      session_success_rate: data.metrics.session_success_rate?.values.rate || 0,
      concurrent_db_success_rate: data.metrics.concurrent_db_success_rate?.values.rate || 0,
      connection_pool_efficiency: data.metrics.connection_pool_efficiency?.values.rate || 0,
      max_concurrent_sessions: ACTIVE_SESSIONS.size,
    };

    summary['reports/concurrent-sessions-metrics.json'] = JSON.stringify(sessionMetrics, null, 2);
  }

  return summary;
}