// k6-tests/scenarios/auth-workflow-test.js
// Authentication workflow load testing scenario

import { check, sleep } from 'k6';
import { BASE_CONFIG, SCENARIOS } from '../configs/base-config.js';
import { httpUtils } from '../utils/http-utils.js';
import { authUtils } from '../utils/auth-utils.js';
import { generateTestUser } from '../utils/data-generators.js';

export const options = {
  scenarios: {
    auth_gradual_ramp: {
      ...BASE_CONFIG.SCENARIOS.GRADUAL_RAMP,
      tags: { test_type: 'auth_gradual_ramp' },
      exec: 'authGradualRamp',
    },
    auth_sustained_load: {
      ...BASE_CONFIG.SCENARIOS.SUSTAINED_LOAD,
      tags: { test_type: 'auth_sustained_load' },
      exec: 'authSustainedLoad',
    },
    auth_spike_test: {
      ...BASE_CONFIG.SCENARIOS.SPIKE_TEST,
      tags: { test_type: 'auth_spike_test' },
      exec: 'authSpikeTest',
    },
  },
  thresholds: {
    ...BASE_CONFIG.THRESHOLDS,
    auth_duration: ['p(95)<1500', 'p(99)<3000'],
    'auth_success_rate': ['rate>0.95'],
  },
};

// Test data
const TEST_USERS = [];

// Setup function - runs before the test starts
export function setup() {
  console.log('Setting up authentication test data...');

  // Generate test users for authentication testing
  for (let i = 0; i < BASE_CONFIG.TEST_DATA.USERS_COUNT; i++) {
    TEST_USERS.push(generateTestUser(i));
  }

  console.log(`Generated ${TEST_USERS.length} test users for authentication testing`);

  return { testUsers: TEST_USERS };
}

// Teardown function - runs after the test completes
export function teardown(data) {
  console.log('Cleaning up authentication test data...');
  authUtils.clearAllTokens();
}

// Gradual ramp authentication test
export async function authGradualRamp(data) {
  const userIndex = __VU % data.testUsers.length;
  const user = data.testUsers[userIndex];

  // Authentication workflow
  await executeAuthWorkflow(user);
}

// Sustained load authentication test
export async function authSustainedLoad(data) {
  const userIndex = __VU % data.testUsers.length;
  const user = data.testUsers[userIndex];

  // Continuous authentication workflow with token refresh
  await executeAuthWorkflow(user);

  // Simulate user session with periodic token validation
  const sessionDuration = Math.random() * 300; // 0-5 minutes
  const endTime = Date.now() + (sessionDuration * 1000);

  while (Date.now() < endTime) {
    // Validate current session
    const profileResponse = await authUtils.getUserProfile();
    check(profileResponse, {
      'profile_load_success': (r) => r.status === 200,
      'profile_load_duration': (r) => r.timings.duration < BASE_CONFIG.TARGETS.RESPONSE_TIME_P95,
    });

    // Random delay between session checks (10-60 seconds)
    const delay = 10 + Math.random() * 50;
    sleep(delay);
  }
}

// Spike test for authentication
export async function authSpikeTest(data) {
  const userIndex = __VU % data.testUsers.length;
  const user = data.testUsers[userIndex];

  // Rapid authentication attempts during spike
  await executeAuthWorkflow(user);

  // Additional stress during spike - multiple rapid logins
  for (let i = 0; i < 3; i++) {
    await executeAuthWorkflow(user);
    sleep(0.1); // Very short delay
  }
}

// Common authentication workflow function
async function executeAuthWorkflow(user) {
  const startTime = Date.now();

  try {
    // Step 1: User Login
    console.log(`User ${user.id} attempting login`);
    const loginResult = await authUtils.login(user.email, user.password, user.id);

    check(loginResult, {
      'login_success': (r) => r.success === true,
      'login_token_received': (r) => r.token && r.token.length > 0,
    });

    if (!loginResult.success) {
      console.error(`Login failed for user ${user.id}: ${loginResult.error}`);
      return;
    }

    // Step 2: Get user profile
    const profileResponse = await authUtils.getUserProfile();
    check(profileResponse, {
      'profile_load_success': (r) => r.status === 200,
      'profile_load_duration': (r) => r.timings.duration < BASE_CONFIG.TARGETS.RESPONSE_TIME_P95,
    });

    // Step 3: Token refresh test (simulate token expiration)
    sleep(2); // Simulate some time passing

    const refreshResult = await authUtils.refreshToken(loginResult.refreshToken, user.id);
    check(refreshResult, {
      'token_refresh_success': (r) => r.success === true,
      'refresh_token_received': (r) => r.token && r.token.length > 0,
    });

    // Step 4: Validate refreshed token
    if (refreshResult.success) {
      httpUtils.setAuthToken(refreshResult.token);
      const refreshedProfileResponse = await authUtils.getUserProfile();
      check(refreshedProfileResponse, {
        'refreshed_profile_load_success': (r) => r.status === 200,
        'refreshed_profile_load_duration': (r) => r.timings.duration < BASE_CONFIG.TARGETS.RESPONSE_TIME_P95,
      });
    }

    // Step 5: User logout
    const logoutSuccess = await authUtils.logout(user.id);
    check(logoutSuccess, {
      'logout_success': (r) => r === true,
    });

    // Step 6: Verify logout (should fail with 401)
    const postLogoutProfileResponse = await authUtils.getUserProfile();
    check(postLogoutProfileResponse, {
      'post_logout_access_denied': (r) => r.status === 401,
    });

    const duration = Date.now() - startTime;
    console.log(`User ${user.id} auth workflow completed in ${duration}ms`);

    // Custom metrics for auth workflow
    const authDurationMetric = new Counter('auth_workflow_duration');
    authDurationMetric.add(duration);

  } catch (error) {
    console.error(`Auth workflow failed for user ${user.id}:`, error);
    const authErrorMetric = new Rate('auth_workflow_errors');
    authErrorMetric.add(1);
  }
}

// Handle summary for detailed reporting
export function handleSummary(data) {
  const summary = {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'reports/auth-workflow-summary.json': JSON.stringify(data, null, 2),
    'reports/auth-workflow-report.html': htmlReport(data),
  };

  // Custom summary metrics
  if (data.metrics) {
    const authMetrics = {
      total_requests: data.metrics.http_reqs?.values.count || 0,
      failed_requests: data.metrics.http_req_failed?.values.rate || 0,
      avg_response_time: data.metrics.http_req_duration?.values.avg || 0,
      p95_response_time: data.metrics.http_req_duration?.values['p(95)'] || 0,
      p99_response_time: data.metrics.http_req_duration?.values['p(99)'] || 0,
      auth_duration_p95: data.metrics.auth_duration?.values['p(95)'] || 0,
      auth_success_rate: data.metrics.auth_success_rate?.values.rate || 0,
    };

    summary['reports/auth-metrics.json'] = JSON.stringify(authMetrics, null, 2);
  }

  return summary;
}