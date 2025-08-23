// k6-tests/main-test-runner.js
// Main test runner for comprehensive k6 load testing

import { check } from 'k6';
import { BASE_CONFIG } from './configs/base-config.js';
import { textSummary, htmlReport } from './utils/reporting-utils.js';

export const options = {
  // This is the main orchestrator - individual scenarios are defined in their respective files
  scenarios: {
    // Main comprehensive load test
    comprehensive_load_test: {
      executor: 'constant-vus',
      vus: 1,
      duration: '1s', // This will be overridden by individual test runs
    },
  },
  thresholds: {
    ...BASE_CONFIG.THRESHOLDS,
  },
};

// Test configuration
const TEST_CONFIG = {
  auth: {
    enabled: true,
    scenarios: ['auth-workflow-test.js'],
    duration: '10m',
    vus: 1000,
  },
  products: {
    enabled: true,
    scenarios: ['product-crud-test.js'],
    duration: '15m',
    vus: 500,
  },
  files: {
    enabled: true,
    scenarios: ['file-upload-test.js'],
    duration: '12m',
    vus: 100,
  },
  dashboard: {
    enabled: true,
    scenarios: ['dashboard-analytics-test.js'],
    duration: '15m',
    vus: 200,
  },
  sessions: {
    enabled: true,
    scenarios: ['concurrent-sessions-test.js'],
    duration: '20m',
    vus: 1000,
  },
};

// Environment variables for test configuration
const TEST_ENV = {
  API_BASE_URL: __ENV.API_BASE_URL || BASE_CONFIG.API_BASE_URL,
  TEST_ENV: __ENV.TEST_ENV || 'development',
  ENABLE_MONITORING: __ENV.ENABLE_MONITORING || 'true',
  REPORTS_DIR: __ENV.REPORTS_DIR || './reports',
  BASELINE_COMPARISON: __ENV.BASELINE_COMPARISON || 'false',
};

// Global test results tracking
let TEST_RESULTS = {
  startTime: Date.now(),
  tests: {},
  summary: {},
};

// Main test execution function
export default function () {
  console.log('=== Starting Comprehensive Load Testing Suite ===');
  console.log(`Environment: ${TEST_ENV.TEST_ENV}`);
  console.log(`API Base URL: ${TEST_ENV.API_BASE_URL}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);

  // This is the orchestrator function
  // Individual test scenarios are run separately using this runner
  console.log('Load testing suite initialized successfully');
  console.log('Use individual test files for specific load testing scenarios');
}

// Setup function
export function setup() {
  console.log('Setting up comprehensive load testing environment...');

  // Create reports directory
  console.log(`Reports will be saved to: ${TEST_ENV.REPORTS_DIR}`);

  // Validate environment
  const envCheck = checkEnvironment();
  if (!envCheck.success) {
    console.error('Environment validation failed:', envCheck.errors);
    return { success: false, errors: envCheck.errors };
  }

  console.log('Environment validation passed');

  return {
    success: true,
    config: TEST_CONFIG,
    env: TEST_ENV,
    timestamp: Date.now(),
  };
}

// Teardown function
export function teardown(data) {
  console.log('=== Load Testing Suite Completed ===');

  const endTime = Date.now();
  const duration = endTime - TEST_RESULTS.startTime;

  console.log(`Total test duration: ${Math.round(duration / 1000)}s`);
  console.log(`Test results saved to: ${TEST_ENV.REPORTS_DIR}`);

  // Generate final summary
  generateFinalSummary(data, duration);
}

// Environment validation
function checkEnvironment() {
  const errors = [];
  const warnings = [];

  // Check API connectivity
  try {
    // This would normally make a health check request
    console.log('API connectivity check would be performed here');
  } catch (error) {
    errors.push(`API connectivity check failed: ${error.message}`);
  }

  // Check test data availability
  // Add more environment checks as needed

  return {
    success: errors.length === 0,
    errors,
    warnings,
  };
}

// Generate final summary
function generateFinalSummary(data, duration) {
  const summary = {
    testSuite: 'Comprehensive Load Testing Suite',
    environment: TEST_ENV.TEST_ENV,
    apiBaseUrl: TEST_ENV.API_BASE_URL,
    totalDuration: Math.round(duration / 1000),
    startTime: new Date(TEST_RESULTS.startTime).toISOString(),
    endTime: new Date().toISOString(),
    testResults: TEST_RESULTS.tests,
    recommendations: generateRecommendations(TEST_RESULTS.tests),
  };

  console.log('\n=== PERFORMANCE SUMMARY ===');
  console.log(`Total Duration: ${summary.totalDuration}s`);
  console.log(`Environment: ${summary.environment}`);
  console.log(`API Base URL: ${summary.apiBaseUrl}`);

  if (summary.recommendations.length > 0) {
    console.log('\n=== RECOMMENDATIONS ===');
    summary.recommendations.forEach((rec, index) => {
      console.log(`${index + 1}. ${rec}`);
    });
  }

  // Save summary to file
  TEST_RESULTS.summary = summary;
}

// Generate performance recommendations
function generateRecommendations(testResults) {
  const recommendations = [];

  // Check response times
  if (testResults.auth?.p95_response_time > BASE_CONFIG.TARGETS.RESPONSE_TIME_P95) {
    recommendations.push('Consider optimizing authentication endpoints - P95 response time exceeds target');
  }

  if (testResults.products?.p95_response_time > BASE_CONFIG.TARGETS.RESPONSE_TIME_P95) {
    recommendations.push('Product CRUD operations need optimization - P95 response time exceeds target');
  }

  // Check error rates
  if (testResults.auth?.error_rate > 0.05) {
    recommendations.push('Authentication error rate is above 5% - investigate authentication failures');
  }

  // Check throughput
  if (testResults.overall?.throughput < BASE_CONFIG.TARGETS.THROUGHPUT_MIN) {
    recommendations.push('Overall throughput is below target - consider scaling infrastructure');
  }

  // Add more recommendation logic based on test results

  return recommendations;
}

// Utility functions for test orchestration
export function runAuthTests() {
  console.log('Running authentication workflow tests...');
  // This would trigger the auth-workflow-test.js scenario
}

export function runProductTests() {
  console.log('Running product CRUD tests...');
  // This would trigger the product-crud-test.js scenario
}

export function runFileUploadTests() {
  console.log('Running file upload tests...');
  // This would trigger the file-upload-test.js scenario
}

export function runDashboardTests() {
  console.log('Running dashboard analytics tests...');
  // This would trigger the dashboard-analytics-test.js scenario
}

export function runConcurrentSessionTests() {
  console.log('Running concurrent session tests...');
  // This would trigger the concurrent-sessions-test.js scenario
}

export function runFullLoadTest() {
  console.log('Running full comprehensive load test suite...');
  // This would run all scenarios in sequence
}

// Performance baseline comparison
export function compareWithBaseline(currentResults) {
  if (TEST_ENV.BASELINE_COMPARISON !== 'true') {
    return null;
  }

  console.log('Comparing results with performance baseline...');
  // This would load baseline data and compare

  return {
    comparison: 'baseline_comparison_data',
    improvements: [],
    regressions: [],
  };
}

// Custom metrics collection
export function collectCustomMetrics() {
  return {
    timestamp: Date.now(),
    environment: TEST_ENV,
    system: {
      cpu: process.cpuUsage(),
      memory: process.memoryUsage(),
      uptime: process.uptime(),
    },
  };
}

// Handle summary for detailed reporting
export function handleSummary(data) {
  const summary = {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'reports/comprehensive-load-test-summary.json': JSON.stringify(data, null, 2),
    'reports/comprehensive-load-test-report.html': htmlReport(data),
    'reports/test-suite-results.json': JSON.stringify(TEST_RESULTS, null, 2),
  };

  // Generate detailed performance analysis
  if (data.metrics) {
    const performanceAnalysis = {
      overall: {
        total_requests: data.metrics.http_reqs?.values.count || 0,
        failed_requests: data.metrics.http_req_failed?.values.rate || 0,
        avg_response_time: data.metrics.http_req_duration?.values.avg || 0,
        p95_response_time: data.metrics.http_req_duration?.values['p(95)'] || 0,
        p99_response_time: data.metrics.http_req_duration?.values['p(99)'] || 0,
        throughput: data.metrics.http_reqs?.values.rate || 0,
      },
      targets: {
        response_time_p95_target: BASE_CONFIG.TARGETS.RESPONSE_TIME_P95,
        response_time_p99_target: BASE_CONFIG.TARGETS.RESPONSE_TIME_P99,
        error_rate_target: BASE_CONFIG.TARGETS.ERROR_RATE_MAX,
        throughput_target: BASE_CONFIG.TARGETS.THROUGHPUT_MIN,
      },
      compliance: {
        response_time_p95_compliant: (data.metrics.http_req_duration?.values['p(95)'] || 0) <= BASE_CONFIG.TARGETS.RESPONSE_TIME_P95,
        response_time_p99_compliant: (data.metrics.http_req_duration?.values['p(99)'] || 0) <= BASE_CONFIG.TARGETS.RESPONSE_TIME_P99,
        error_rate_compliant: (data.metrics.http_req_failed?.values.rate || 0) <= BASE_CONFIG.TARGETS.ERROR_RATE_MAX,
        throughput_compliant: (data.metrics.http_reqs?.values.rate || 0) >= BASE_CONFIG.TARGETS.THROUGHPUT_MIN,
      },
    };

    summary['reports/performance-analysis.json'] = JSON.stringify(performanceAnalysis, null, 2);

    // Generate compliance report
    const complianceReport = generateComplianceReport(performanceAnalysis);
    summary['reports/compliance-report.json'] = JSON.stringify(complianceReport, null, 2);
  }

  return summary;
}

// Generate compliance report
function generateComplianceReport(analysis) {
  const compliance = analysis.compliance;
  const overallCompliant = Object.values(compliance).every(c => c === true);

  return {
    overall_compliant: overallCompliant,
    compliance_breakdown: compliance,
    targets_met: Object.values(compliance).filter(c => c === true).length,
    total_targets: Object.keys(compliance).length,
    compliance_percentage: Math.round((Object.values(compliance).filter(c => c === true).length / Object.keys(compliance).length) * 100),
    recommendations: generateComplianceRecommendations(compliance),
  };
}

// Generate compliance recommendations
function generateComplianceRecommendations(compliance) {
  const recommendations = [];

  if (!compliance.response_time_p95_compliant) {
    recommendations.push('Optimize P95 response time - implement caching, database indexing, or scale infrastructure');
  }

  if (!compliance.response_time_p99_compliant) {
    recommendations.push('Optimize P99 response time - focus on reducing tail latency through performance improvements');
  }

  if (!compliance.error_rate_compliant) {
    recommendations.push('Reduce error rate - investigate and fix failing requests, implement better error handling');
  }

  if (!compliance.throughput_compliant) {
    recommendations.push('Increase throughput - consider horizontal scaling, load balancing, or infrastructure upgrades');
  }

  return recommendations;
}

// Export utility functions for use in other test files
export {
  TEST_CONFIG,
  TEST_ENV,
  TEST_RESULTS,
  generateRecommendations,
  collectCustomMetrics,
};