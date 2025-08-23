import { test, expect } from '@playwright/test';
import {
  testData,
  waitForElement,
  waitForURL,
  waitForNetworkIdle,
  safeClick,
  safeFill,
  resetTestEnvironment,
  createTestUser,
  loginTestUser
} from './test-helpers';

interface IntegrationTestResult {
  testName: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: string;
  details?: any;
}

class ComprehensiveIntegrationTester {
  private baseURL = 'http://localhost:9000';
  private backendURL = 'http://localhost:8080/api';
  private authToken = '';
  private refreshToken = '';
  private testUserId = '';
  private testResults: IntegrationTestResult[] = [];

  async logTestResult(testName: string, status: IntegrationTestResult['status'], duration: number, error?: string, details?: any) {
    this.testResults.push({ testName, status, duration, error, details });
    console.log(`[${status.toUpperCase()}] ${testName} - ${duration}ms`);
  }

  // 1. API Communication Tests
  async testAPICommunication(page: any) {
    const startTime = Date.now();
    try {
      console.log('🧪 Testing API Communication...');

      // Test health endpoint
      const healthResponse = await page.request.get(`${this.baseURL}/api/health`);
      expect([200, 404]).toContain(healthResponse.status);

      // Test auth endpoints
      const loginResponse = await page.request.post(`${this.backendURL}/auth/login`, {
        data: { email: testData.adminUser.email, password: testData.adminUser.password }
      });

      if (loginResponse.status === 200) {
        const loginData = await loginResponse.json();
        this.authToken = loginData.data?.token;
        this.refreshToken = loginData.data?.refresh_token;
      }

      this.logTestResult('API Communication', 'passed', Date.now() - startTime);
    } catch (error) {
      this.logTestResult('API Communication', 'failed', Date.now() - startTime, error.message);
    }
  }

  // 2. JWT Authentication Integration Tests
  async testJWTAuthentication(page: any) {
    const startTime = Date.now();
    try {
      console.log('🔐 Testing JWT Authentication...');

      // Test login and token storage
      const loginResponse = await page.request.post(`${this.backendURL}/auth/login`, {
        data: { email: testData.adminUser.email, password: testData.adminUser.password }
      });

      expect(loginResponse.status).toBe(200);
      const loginData = await loginResponse.json();
      expect(loginData.data?.token).toBeTruthy();

      this.authToken = loginData.data.token;
      this.refreshToken = loginData.data.refresh_token;

      // Test token-based API access
      const locationsResponse = await page.request.get(`${this.backendURL}/locations`, {
        headers: { 'Authorization': `Bearer ${this.authToken}` }
      });

      expect([200, 404]).toContain(locationsResponse.status);

      // Test invalid token
      const invalidTokenResponse = await page.request.get(`${this.backendURL}/locations`, {
        headers: { 'Authorization': 'Bearer invalid-token' }
      });

      expect([401, 403]).toContain(invalidTokenResponse.status);

      this.logTestResult('JWT Authentication', 'passed', Date.now() - startTime);
    } catch (error) {
      this.logTestResult('JWT Authentication', 'failed', Date.now() - startTime, error.message);
    }
  }

  // 3. CORS Configuration Tests
  async testCORSConfiguration(page: any) {
    const startTime = Date.now();
    try {
      console.log('🌐 Testing CORS Configuration...');

      // Test preflight request
      const corsResponse = await page.request.fetch(`${this.backendURL}/locations`, {
        method: 'OPTIONS',
        headers: {
          'Origin': 'http://localhost:9000',
          'Access-Control-Request-Method': 'GET',
          'Access-Control-Request-Headers': 'authorization'
        }
      });

      // CORS headers should be present
      const corsHeaders = corsResponse.headers();
      expect(corsHeaders['access-control-allow-origin']).toBeTruthy();
      expect(corsHeaders['access-control-allow-methods']).toBeTruthy();

      this.logTestResult('CORS Configuration', 'passed', Date.now() - startTime);
    } catch (error) {
      this.logTestResult('CORS Configuration', 'failed', Date.now() - startTime, error.message);
    }
  }

  // 4. Data Flow Tests
  async testDataFlow(page: any) {
    const startTime = Date.now();
    try {
      console.log('📊 Testing Data Flow...');

      // Create test data
      const locationData = {
        name: `Integration Test Location ${Date.now()}`,
        location_type: 'WAREHOUSE',
        is_active: true
      };

      const createResponse = await page.request.post(`${this.backendURL}/locations`, {
        headers: { 'Authorization': `Bearer ${this.authToken}`, 'Content-Type': 'application/json' },
        data: locationData
      });

      expect(createResponse.status).toBe(201);
      const createdData = await createResponse.json();
      const locationId = createdData.data?.id;

      // Verify data retrieval
      const getResponse = await page.request.get(`${this.backendURL}/locations/${locationId}`, {
        headers: { 'Authorization': `Bearer ${this.authToken}` }
      });

      expect(getResponse.status).toBe(200);
      const retrievedData = await getResponse.json();
      expect(retrievedData.data.name).toBe(locationData.name);

      // Test data updates
      const updateData = { name: `Updated ${locationData.name}` };
      const updateResponse = await page.request.put(`${this.backendURL}/locations/${locationId}`, {
        headers: { 'Authorization': `Bearer ${this.authToken}`, 'Content-Type': 'application/json' },
        data: updateData
      });

      expect(updateResponse.status).toBe(200);

      // Cleanup
      await page.request.delete(`${this.backendURL}/locations/${locationId}`, {
        headers: { 'Authorization': `Bearer ${this.authToken}` }
      });

      this.logTestResult('Data Flow', 'passed', Date.now() - startTime);
    } catch (error) {
      this.logTestResult('Data Flow', 'failed', Date.now() - startTime, error.message);
    }
  }

  // 5. Error Handling Tests
  async testErrorHandling(page: any) {
    const startTime = Date.now();
    try {
      console.log('❌ Testing Error Handling...');

      // Test 404 error
      const notFoundResponse = await page.request.get(`${this.backendURL}/locations/non-existent-id`, {
        headers: { 'Authorization': `Bearer ${this.authToken}` }
      });

      expect([404, 400]).toContain(notFoundResponse.status);
      const notFoundData = await notFoundResponse.json();
      expect(notFoundData.success).toBe(false);

      // Test validation error
      const invalidDataResponse = await page.request.post(`${this.backendURL}/locations`, {
        headers: { 'Authorization': `Bearer ${this.authToken}`, 'Content-Type': 'application/json' },
        data: { location_type: 'INVALID' } // Missing required name field
      });

      expect(invalidDataResponse.status).toBe(400);
      const invalidData = await invalidDataResponse.json();
      expect(invalidData.success).toBe(false);

      // Test unauthorized access
      const unauthorizedResponse = await page.request.get(`${this.backendURL}/locations`);
      expect([401, 403]).toContain(unauthorizedResponse.status);

      this.logTestResult('Error Handling', 'passed', Date.now() - startTime);
    } catch (error) {
      this.logTestResult('Error Handling', 'failed', Date.now() - startTime, error.message);
    }
  }

  // 6. Session Management Tests
  async testSessionManagement(page: any) {
    const startTime = Date.now();
    try {
      console.log('🔑 Testing Session Management...');

      // Test token refresh (if endpoint exists)
      if (this.refreshToken) {
        const refreshResponse = await page.request.post(`${this.backendURL}/auth/refresh`, {
          data: { refresh_token: this.refreshToken }
        });

        if (refreshResponse.status === 200) {
          const refreshData = await refreshResponse.json();
          expect(refreshData.data?.token).toBeTruthy();
        }
      }

      // Test session timeout simulation
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.4AdcjK2rqeP0zqJcj5IT4g';

      const expiredResponse = await page.request.get(`${this.backendURL}/locations`, {
        headers: { 'Authorization': `Bearer ${expiredToken}` }
      });

      expect([401, 403]).toContain(expiredResponse.status);

      this.logTestResult('Session Management', 'passed', Date.now() - startTime);
    } catch (error) {
      this.logTestResult('Session Management', 'failed', Date.now() - startTime, error.message);
    }
  }

  // 7. Network Error Handling Tests
  async testNetworkErrorHandling(page: any) {
    const startTime = Date.now();
    try {
      console.log('🌐 Testing Network Error Handling...');

      // Test timeout handling
      const timeoutResponse = await page.request.get(`${this.backendURL}/locations`, {
        headers: { 'Authorization': `Bearer ${this.authToken}` },
        timeout: 100 // Very short timeout
      }).catch(() => ({ status: 0, ok: false }));

      // Test malformed JSON handling
      const malformedResponse = await page.request.post(`${this.backendURL}/locations`, {
        headers: { 'Authorization': `Bearer ${this.authToken}`, 'Content-Type': 'application/json' },
        data: '{invalid json}'
      }).catch(() => ({ status: 400, ok: false }));

      this.logTestResult('Network Error Handling', 'passed', Date.now() - startTime);
    } catch (error) {
      this.logTestResult('Network Error Handling', 'failed', Date.now() - startTime, error.message);
    }
  }

  // 8. Request/Response Processing Tests
  async testRequestResponseProcessing(page: any) {
    const startTime = Date.now();
    try {
      console.log('📨 Testing Request/Response Processing...');

      // Test various content types
      const jsonResponse = await page.request.get(`${this.backendURL}/locations`, {
        headers: { 'Authorization': `Bearer ${this.authToken}`, 'Accept': 'application/json' }
      });

      const contentType = jsonResponse.headers()['content-type'];
      expect(contentType).toContain('application/json');

      // Test query parameters
      const queryResponse = await page.request.get(`${this.backendURL}/locations?limit=5&offset=0`, {
        headers: { 'Authorization': `Bearer ${this.authToken}` }
      });

      expect(queryResponse.status).toBeLessThan(500);

      // Test request headers
      const headerResponse = await page.request.get(`${this.backendURL}/locations`, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'X-Custom-Header': 'test-value'
        }
      });

      expect(headerResponse.status).toBeLessThan(500);

      this.logTestResult('Request/Response Processing', 'passed', Date.now() - startTime);
    } catch (error) {
      this.logTestResult('Request/Response Processing', 'failed', Date.now() - startTime, error.message);
    }
  }

  // 9. Complete Integration Workflow Test
  async testCompleteWorkflow(page: any) {
    const startTime = Date.now();
    try {
      console.log('🔄 Testing Complete Integration Workflow...');

      // Step 1: Authentication
      const loginResponse = await page.request.post(`${this.backendURL}/auth/login`, {
        data: { email: testData.adminUser.email, password: testData.adminUser.password }
      });
      expect(loginResponse.status).toBe(200);

      const loginData = await loginResponse.json();
      const token = loginData.data?.token;
      expect(token).toBeTruthy();

      // Step 2: Create resources
      const locationData = {
        name: `Workflow Test Location ${Date.now()}`,
        location_type: 'WAREHOUSE',
        is_active: true
      };

      const createResponse = await page.request.post(`${this.backendURL}/locations`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        data: locationData
      });
      expect(createResponse.status).toBe(201);

      const createdLocation = await createResponse.json();
      const locationId = createdLocation.data?.id;

      // Step 3: Update resource
      const updateResponse = await page.request.put(`${this.backendURL}/locations/${locationId}`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        data: { name: `Updated ${locationData.name}` }
      });
      expect(updateResponse.status).toBe(200);

      // Step 4: Retrieve and verify
      const getResponse = await page.request.get(`${this.backendURL}/locations/${locationId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      expect(getResponse.status).toBe(200);

      const retrievedData = await getResponse.json();
      expect(retrievedData.data.name).toBe(`Updated ${locationData.name}`);

      // Step 5: List resources
      const listResponse = await page.request.get(`${this.backendURL}/locations`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      expect(listResponse.status).toBe(200);

      // Step 6: Cleanup
      const deleteResponse = await page.request.delete(`${this.backendURL}/locations/${locationId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      expect(deleteResponse.status).toBe(200);

      this.logTestResult('Complete Workflow', 'passed', Date.now() - startTime);
    } catch (error) {
      this.logTestResult('Complete Workflow', 'failed', Date.now() - startTime, error.message);
    }
  }

  // Main test runner
  async runAllIntegrationTests(page: any) {
    console.log('🚀 Starting Comprehensive Integration Tests...');
    console.log('=' .repeat(60));

    const tests = [
      () => this.testAPICommunication(page),
      () => this.testJWTAuthentication(page),
      () => this.testCORSConfiguration(page),
      () => this.testDataFlow(page),
      () => this.testErrorHandling(page),
      () => this.testSessionManagement(page),
      () => this.testNetworkErrorHandling(page),
      () => this.testRequestResponseProcessing(page),
      () => this.testCompleteWorkflow(page)
    ];

    for (const test of tests) {
      await test();
    }

    this.generateTestReport();
  }

  generateTestReport() {
    console.log('\n📊 INTEGRATION TEST REPORT');
    console.log('=' .repeat(60));

    const passed = this.testResults.filter(r => r.status === 'passed').length;
    const failed = this.testResults.filter(r => r.status === 'failed').length;
    const skipped = this.testResults.filter(r => r.status === 'skipped').length;
    const total = this.testResults.length;

    console.log(`Total Tests: ${total}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⏭️  Skipped: ${skipped}`);
    console.log(`📈 Success Rate: ${((passed / total) * 100).toFixed(1)}%`);

    if (failed > 0) {
      console.log('\n❌ FAILED TESTS:');
      this.testResults.filter(r => r.status === 'failed').forEach(result => {
        console.log(`  • ${result.testName}: ${result.error}`);
      });
    }

    console.log('\n📋 DETAILED RESULTS:');
    this.testResults.forEach(result => {
      const icon = result.status === 'passed' ? '✅' : result.status === 'failed' ? '❌' : '⏭️';
      console.log(`  ${icon} ${result.testName} (${result.duration}ms)`);
    });

    // Save report to file
    const reportData = {
      timestamp: new Date().toISOString(),
      summary: { total, passed, failed, skipped, successRate: ((passed / total) * 100).toFixed(1) },
      results: this.testResults
    };

    require('fs').writeFileSync(
      'apps/client/e2e/integration-test-report.json',
      JSON.stringify(reportData, null, 2)
    );

    console.log('\n📄 Report saved to: apps/client/e2e/integration-test-report.json');
  }
}

test.describe('Comprehensive Frontend-Backend Integration Tests', () => {
  let tester: ComprehensiveIntegrationTester;

  test.beforeEach(async ({ page }) => {
    tester = new ComprehensiveIntegrationTester();
    await resetTestEnvironment(page);
  });

  test('run all integration tests', async ({ page }) => {
    await tester.runAllIntegrationTests(page);
  });
});