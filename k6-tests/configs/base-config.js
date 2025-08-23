// k6-tests/configs/base-config.js
// Base configuration for k6 load testing

export const BASE_CONFIG = {
  // API Configuration
  API_BASE_URL: __ENV.API_BASE_URL || 'http://localhost:8080/api',

  // Test Environment
  TEST_ENV: __ENV.TEST_ENV || 'development',

  // Performance Targets
  TARGETS: {
    RESPONSE_TIME_P95: 1500, // 1.5 seconds in milliseconds
    RESPONSE_TIME_P99: 3000, // 3 seconds in milliseconds
    ERROR_RATE_MAX: 1, // 1% maximum error rate
    CPU_USAGE_MAX: 80, // 80% maximum CPU usage
    MEMORY_USAGE_MAX: 85, // 85% maximum memory usage
    THROUGHPUT_MIN: 500, // 500 requests per second minimum
  },

  // Load Testing Scenarios
  SCENARIOS: {
    // Gradual ramp-up to 1000+ users
    GRADUAL_RAMP: {
      executor: 'ramping-vus',
      stages: [
        { duration: '2m', target: 100 },   // Ramp up to 100 users
        { duration: '5m', target: 500 },   // Ramp up to 500 users
        { duration: '10m', target: 1000 }, // Ramp up to 1000 users
        { duration: '15m', target: 1500 }, // Ramp up to 1500 users
        { duration: '20m', target: 1000 }, // Ramp down to 1000 users
        { duration: '10m', target: 1000 }, // Sustained load at 1000 users
      ],
    },

    // Sustained high load
    SUSTAINED_LOAD: {
      executor: 'constant-vus',
      vus: 1000,
      duration: '30m',
    },

    // Spike testing
    SPIKE_TEST: {
      executor: 'ramping-vus',
      stages: [
        { duration: '1m', target: 100 },
        { duration: '10s', target: 2000 }, // Sudden spike to 2000 users
        { duration: '1m', target: 2000 },  // Maintain spike
        { duration: '10s', target: 100 },  // Sudden drop
        { duration: '1m', target: 100 },
      ],
    },

    // Stress testing
    STRESS_TEST: {
      executor: 'ramping-vus',
      stages: [
        { duration: '2m', target: 100 },
        { duration: '5m', target: 500 },
        { duration: '5m', target: 1000 },
        { duration: '5m', target: 2000 },
        { duration: '5m', target: 3000 }, // Beyond normal capacity
        { duration: '5m', target: 100 },  // Recovery
      ],
    },
  },

  // HTTP Configuration
  HTTP: {
    timeout: '30s',
    redirects: 3,
    compression: true,
  },

  // Thresholds for performance validation
  THRESHOLDS: {
    http_req_duration: ['p(95)<1500', 'p(99)<3000'],
    http_req_failed: ['rate<0.01'], // Less than 1% error rate
    http_reqs: ['rate>500'], // Minimum 500 requests per second
  },

  // Test Data Configuration
  TEST_DATA: {
    USERS_COUNT: 1000,
    PRODUCTS_COUNT: 5000,
    CUSTOMERS_COUNT: 2000,
    SUPPLIERS_COUNT: 1000,
    ORDERS_COUNT: 3000,
  },
};

// Export for use in other files
export default BASE_CONFIG;