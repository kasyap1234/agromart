// k6-tests/scenarios/product-crud-test.js
// Product management CRUD operations load testing scenario

import { check, sleep } from 'k6';
import { BASE_CONFIG, SCENARIOS } from '../configs/base-config.js';
import { httpUtils } from '../utils/http-utils.js';
import { authUtils } from '../utils/auth-utils.js';
import { generateTestProduct, generateTestUser } from '../utils/data-generators.js';

export const options = {
  scenarios: {
    product_crud_gradual_ramp: {
      ...BASE_CONFIG.SCENARIOS.GRADUAL_RAMP,
      tags: { test_type: 'product_crud_gradual_ramp' },
      exec: 'productCrudGradualRamp',
    },
    product_crud_sustained_load: {
      ...BASE_CONFIG.SCENARIOS.SUSTAINED_LOAD,
      tags: { test_type: 'product_crud_sustained_load' },
      exec: 'productCrudSustainedLoad',
    },
  },
  thresholds: {
    ...BASE_CONFIG.THRESHOLDS,
    product_operations_duration: ['p(95)<2000', 'p(99)<4000'],
    'product_crud_success_rate': ['rate>0.95'],
    'product_search_success_rate': ['rate>0.98'],
  },
};

// Test data
let TEST_USERS = [];
let TEST_PRODUCTS = [];
let CREATED_PRODUCTS = [];

// Setup function
export function setup() {
  console.log('Setting up product CRUD test data...');

  // Generate test users and authenticate
  for (let i = 0; i < 100; i++) {
    TEST_USERS.push(generateTestUser(i));
  }

  // Generate test products
  for (let i = 0; i < BASE_CONFIG.TEST_DATA.PRODUCTS_COUNT; i++) {
    TEST_PRODUCTS.push(generateTestProduct(i));
  }

  console.log(`Generated ${TEST_USERS.length} test users and ${TEST_PRODUCTS.length} test products`);

  return { testUsers: TEST_USERS, testProducts: TEST_PRODUCTS };
}

// Teardown function
export function teardown(data) {
  console.log('Cleaning up product test data...');

  // Clean up created products
  CREATED_PRODUCTS.forEach(async (productId) => {
    try {
      await httpUtils.delete(`/products/${productId}`);
    } catch (error) {
      console.error(`Failed to cleanup product ${productId}:`, error);
    }
  });

  authUtils.clearAllTokens();
}

// Gradual ramp product CRUD test
export async function productCrudGradualRamp(data) {
  const userIndex = __VU % data.testUsers.length;
  const user = data.testUsers[userIndex];

  // Authenticate first
  await authenticateUser(user);

  // Execute product CRUD workflow
  await executeProductCrudWorkflow(data.testProducts, user.id);
}

// Sustained load product CRUD test
export async function productCrudSustainedLoad(data) {
  const userIndex = __VU % data.testUsers.length;
  const user = data.testUsers[userIndex];

  // Authenticate first
  await authenticateUser(user);

  // Continuous product operations with mixed read/write patterns
  const endTime = Date.now() + (30 * 60 * 1000); // 30 minutes

  while (Date.now() < endTime) {
    // Mix of different operations
    const operationType = Math.random();

    if (operationType < 0.6) {
      // 60% - Read operations (list, get, search)
      await executeProductReadOperations(data.testProducts);
    } else if (operationType < 0.8) {
      // 20% - Create operations
      await executeProductCreateOperation(data.testProducts, user.id);
    } else if (operationType < 0.95) {
      // 15% - Update operations
      await executeProductUpdateOperation(data.testProducts);
    } else {
      // 5% - Delete operations
      await executeProductDeleteOperation();
    }

    // Random delay between operations (0.5-3 seconds)
    sleep(0.5 + Math.random() * 2.5);
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

// Execute complete product CRUD workflow
async function executeProductCrudWorkflow(products, userId) {
  const startTime = Date.now();

  try {
    // Step 1: List products
    const listResponse = httpUtils.get('/products', {}, 'product_operations_duration');
    check(listResponse, {
      'products_list_success': (r) => r.status === 200,
      'products_list_duration': (r) => r.timings.duration < BASE_CONFIG.TARGETS.RESPONSE_TIME_P95,
    });

    // Step 2: Search products
    const searchQuery = products[Math.floor(Math.random() * products.length)].name.split(' ')[0];
    const searchResponse = httpUtils.get(`/products/search?q=${encodeURIComponent(searchQuery)}`, {}, 'product_operations_duration');
    check(searchResponse, {
      'products_search_success': (r) => r.status === 200,
      'products_search_duration': (r) => r.timings.duration < BASE_CONFIG.TARGETS.RESPONSE_TIME_P95,
    });

    // Step 3: Create new product
    const newProduct = products[Math.floor(Math.random() * products.length)];
    const createPayload = JSON.stringify(newProduct);
    const createResponse = httpUtils.post('/products', createPayload, {}, 'product_operations_duration');

    check(createResponse, {
      'product_create_success': (r) => r.status === 201 || r.status === 200,
      'product_create_duration': (r) => r.timings.duration < 2000,
    });

    let createdProductId = null;
    if (createResponse.status === 201 || createResponse.status === 200) {
      try {
        const responseData = JSON.parse(createResponse.body);
        createdProductId = responseData.data?.id || responseData.id;
        if (createdProductId) {
          CREATED_PRODUCTS.push(createdProductId);
        }
      } catch (e) {
        console.error('Failed to parse create response:', e);
      }
    }

    // Step 4: Get specific product
    if (createdProductId) {
      const getResponse = httpUtils.get(`/products/${createdProductId}`, {}, 'product_operations_duration');
      check(getResponse, {
        'product_get_success': (r) => r.status === 200,
        'product_get_duration': (r) => r.timings.duration < BASE_CONFIG.TARGETS.RESPONSE_TIME_P95,
      });

      // Step 5: Update product
      const updatePayload = JSON.stringify({
        name: `${newProduct.name} - Updated`,
        selling_price: newProduct.selling_price + 1,
      });
      const updateResponse = httpUtils.put(`/products/${createdProductId}`, updatePayload, {}, 'product_operations_duration');
      check(updateResponse, {
        'product_update_success': (r) => r.status === 200,
        'product_update_duration': (r) => r.timings.duration < 2000,
      });
    }

    // Step 6: Test product categories/units
    const unitsResponse = httpUtils.get('/units', {}, 'product_operations_duration');
    check(unitsResponse, {
      'units_list_success': (r) => r.status === 200,
      'units_list_duration': (r) => r.timings.duration < BASE_CONFIG.TARGETS.RESPONSE_TIME_P95,
    });

    const duration = Date.now() - startTime;
    console.log(`Product CRUD workflow completed in ${duration}ms for user ${userId}`);

  } catch (error) {
    console.error(`Product CRUD workflow failed for user ${userId}:`, error);
  }
}

// Execute product read operations
async function executeProductReadOperations(products) {
  // List products with pagination
  const page = Math.floor(Math.random() * 10) + 1;
  const limit = Math.floor(Math.random() * 50) + 10;
  const listResponse = httpUtils.get(`/products?page=${page}&limit=${limit}`, {}, 'product_operations_duration');

  check(listResponse, {
    'products_list_paginated_success': (r) => r.status === 200,
    'products_list_paginated_duration': (r) => r.timings.duration < BASE_CONFIG.TARGETS.RESPONSE_TIME_P95,
  });

  // Search products
  if (Math.random() < 0.3) { // 30% chance to search
    const searchQuery = products[Math.floor(Math.random() * products.length)].category;
    const searchResponse = httpUtils.get(`/products/search?q=${encodeURIComponent(searchQuery)}`, {}, 'product_operations_duration');

    check(searchResponse, {
      'products_category_search_success': (r) => r.status === 200,
      'products_category_search_duration': (r) => r.timings.duration < BASE_CONFIG.TARGETS.RESPONSE_TIME_P95,
    });
  }
}

// Execute product create operation
async function executeProductCreateOperation(products, userId) {
  const newProduct = products[Math.floor(Math.random() * products.length)];
  const createPayload = JSON.stringify({
    ...newProduct,
    name: `${newProduct.name} - Load Test ${Date.now()}`,
    sku: `LOADTEST-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  });

  const createResponse = httpUtils.post('/products', createPayload, {}, 'product_operations_duration');

  check(createResponse, {
    'product_create_load_success': (r) => r.status === 201 || r.status === 200,
    'product_create_load_duration': (r) => r.timings.duration < 2000,
  });

  // Store created product for cleanup
  if (createResponse.status === 201 || createResponse.status === 200) {
    try {
      const responseData = JSON.parse(createResponse.body);
      const productId = responseData.data?.id || responseData.id;
      if (productId) {
        CREATED_PRODUCTS.push(productId);
      }
    } catch (e) {
      console.error('Failed to parse create response:', e);
    }
  }
}

// Execute product update operation
async function executeProductUpdateOperation(products) {
  if (CREATED_PRODUCTS.length === 0) return;

  const productId = CREATED_PRODUCTS[Math.floor(Math.random() * CREATED_PRODUCTS.length)];
  const updatePayload = JSON.stringify({
    description: `Updated description - ${Date.now()}`,
    tax_rate: parseFloat((Math.random() * 0.1).toFixed(3)),
  });

  const updateResponse = httpUtils.put(`/products/${productId}`, updatePayload, {}, 'product_operations_duration');

  check(updateResponse, {
    'product_update_load_success': (r) => r.status === 200,
    'product_update_load_duration': (r) => r.timings.duration < 2000,
  });
}

// Execute product delete operation
async function executeProductDeleteOperation() {
  if (CREATED_PRODUCTS.length === 0) return;

  const productIndex = Math.floor(Math.random() * CREATED_PRODUCTS.length);
  const productId = CREATED_PRODUCTS[productIndex];

  const deleteResponse = httpUtils.delete(`/products/${productId}`, {}, 'product_operations_duration');

  check(deleteResponse, {
    'product_delete_load_success': (r) => r.status === 200 || r.status === 204,
    'product_delete_load_duration': (r) => r.timings.duration < 2000,
  });

  // Remove from tracking array
  if (deleteResponse.status === 200 || deleteResponse.status === 204) {
    CREATED_PRODUCTS.splice(productIndex, 1);
  }
}

// Handle summary for detailed reporting
export function handleSummary(data) {
  const summary = {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'reports/product-crud-summary.json': JSON.stringify(data, null, 2),
    'reports/product-crud-report.html': htmlReport(data),
  };

  // Custom summary metrics
  if (data.metrics) {
    const productMetrics = {
      total_requests: data.metrics.http_reqs?.values.count || 0,
      failed_requests: data.metrics.http_req_failed?.values.rate || 0,
      avg_response_time: data.metrics.http_req_duration?.values.avg || 0,
      p95_response_time: data.metrics.http_req_duration?.values['p(95)'] || 0,
      p99_response_time: data.metrics.http_req_duration?.values['p(99)'] || 0,
      product_operations_p95: data.metrics.product_operations_duration?.values['p(95)'] || 0,
      product_crud_success_rate: data.metrics.product_crud_success_rate?.values.rate || 0,
      product_search_success_rate: data.metrics.product_search_success_rate?.values.rate || 0,
      products_created: CREATED_PRODUCTS.length,
    };

    summary['reports/product-crud-metrics.json'] = JSON.stringify(productMetrics, null, 2);
  }

  return summary;
}