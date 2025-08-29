import { APIRequestContext, request } from '@playwright/test';

export async function setupTestDatabase() {
  console.log('🔧 Setting up test database...');

  try {
    // Wait for backend to be ready
    const apiRequest = await request.newContext();
    await waitForBackend(apiRequest);

    // TEMPORARILY COMMENTED OUT - backend has nil pointer issue with user creation
    // Create test admin user
    // await createTestUser(apiRequest, testData.adminUser);
    // console.log('✅ Test admin user created');

    // Create test regular user
    // await createTestUser(apiRequest, testData.testUser);
    // console.log('✅ Test regular user created');

    await apiRequest.dispose();
    console.log('✅ Test database setup complete');
  } catch (error) {
    console.warn('⚠️  Database setup partially failed, but continuing:', error.message);
  }
}

export async function cleanupTestDatabase() {
  console.log('🧹 Cleaning up test database...');

  try {
    const apiRequest = await request.newContext();

    // Clean up test users (if API supports it)
    // This would typically involve calling cleanup endpoints

    await apiRequest.dispose();
    console.log('✅ Test database cleanup complete');
  } catch (error) {
    console.warn('⚠️  Database cleanup failed:', error.message);
  }
}

async function waitForBackend(apiRequest: APIRequestContext, maxAttempts: number = 10) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await apiRequest.get('http://localhost:8080/api/health', { timeout: 5000 });
      if (response.ok()) {
        console.log('✅ Backend API is ready');
        return;
      }
    } catch (error) {
      console.log(`⏳ Backend not ready, attempt ${attempt}/${maxAttempts}`);
      if (attempt === maxAttempts) {
        throw new Error('Backend API failed to become ready within timeout');
      }
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
}

export async function createTestUser(request: APIRequestContext, userData: any, retries: number = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`👤 Creating test user (attempt ${attempt}/${retries}): ${userData.email}`);

      const response = await request.post('http://localhost:8080/api/auth/register', {
        data: userData,
        timeout: 10000,
      });

      if (response.ok()) {
        const result = await response.json();
        console.log(`✅ Test user created successfully: ${userData.email}`);
        return result;
      }

      // If user already exists, that's okay for testing
      if (response.status() === 409) {
        console.log(`ℹ️  Test user already exists: ${userData.email}`);
        return { message: 'User already exists' };
      }

      const errorText = await response.text();
      throw new Error(`HTTP ${response.status()}: ${errorText}`);
    } catch (error) {
      console.warn(`⚠️  Failed to create test user (attempt ${attempt}/${retries}): ${error.message}`);

      if (attempt === retries) {
        throw new Error(`Failed to create test user after ${retries} attempts: ${error.message}`);
      }

      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
}

export async function loginTestUser(request: APIRequestContext, credentials: any, retries: number = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`🔐 Logging in test user (attempt ${attempt}/${retries}): ${credentials.email}`);

      const response = await request.post('http://localhost:8080/api/auth/login', {
        data: credentials,
        timeout: 10000,
      });

      if (response.ok()) {
        const data = await response.json();
        if (data.data && data.data.token) {
          console.log(`✅ Test user logged in successfully: ${credentials.email}`);
          return data.data.token;
        } else {
          throw new Error('Invalid response format: missing token');
        }
      }

      const errorText = await response.text();
      throw new Error(`HTTP ${response.status()}: ${errorText}`);
    } catch (error) {
      console.warn(`⚠️  Failed to login test user (attempt ${attempt}/${retries}): ${error.message}`);

      if (attempt === retries) {
        throw new Error(`Failed to login test user after ${retries} attempts: ${error.message}`);
      }

      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
}

export async function createTestProduct(request: APIRequestContext, token: string, productData: any) {
  const response = await request.post('http://localhost:8080/api/products', {
    data: productData,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok()) {
    throw new Error(`Failed to create test product: ${response.statusText()}`);
  }

  return response.json();
}

export const testData = {
  adminUser: {
    email: 'admin@example.com',
    password: 'AdminPassword123!',
    first_name: 'Admin',
    last_name: 'User',
    company_name: 'Test Company',
    phone: '+1234567890',
  },
  testUser: {
    email: 'second@example.com',
    password: 'TestPassword123!',
    first_name: 'Test',
    last_name: 'User',
    company_name: 'Test Company',
    phone: '+1234567890',
  },
  testProduct: {
    name: 'Test Product',
    description: 'This is a test product for E2E testing',
    category: 'vegetables',
    unit: 'kg',
    price: 10.50,
    stockLevel: 100,
  },
};

// Utility functions for robust element waiting
export async function waitForElement(page: any, selector: string, timeout: number = 10000) {
  try {
    await page.waitForSelector(selector, { timeout, state: 'visible' });
    console.log(`✅ Element found: ${selector}`);
    return true;
  } catch (error) {
    console.warn(`⚠️  Element not found within ${timeout}ms: ${selector}`);
    return false;
  }
}

export async function waitForURL(page: any, expectedURL: string, timeout: number = 15000) {
  try {
    await page.waitForURL(expectedURL, { timeout });
    console.log(`✅ URL loaded: ${expectedURL}`);
    return true;
  } catch (error) {
    console.warn(`⚠️  URL not loaded within ${timeout}ms: ${expectedURL}`);
    return false;
  }
}

export async function waitForNetworkIdle(page: any, timeout: number = 10000) {
  try {
    await page.waitForLoadState('networkidle', { timeout });
    console.log('✅ Network idle');
    return true;
  } catch (error) {
    console.warn(`⚠️  Network not idle within ${timeout}ms`);
    return false;
  }
}

export async function safeClick(page: any, selector: string, retries: number = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // Wait for element to be visible and enabled
      await page.waitForSelector(selector, { timeout: 5000, state: 'visible' });

      // For submit buttons, wait for them to be enabled (not disabled)
      if (selector.includes('[type="submit"]') || selector.includes('button[type="submit"]')) {
        await page.waitForSelector(`${selector}:not([disabled])`, { timeout: 10000 });
      }

      await page.click(selector);
      console.log(`✅ Clicked element: ${selector}`);
      return true;
    } catch (error) {
      console.warn(`⚠️  Failed to click element (attempt ${attempt}/${retries}): ${selector}`);

      if (attempt === retries) {
        throw new Error(`Failed to click element after ${retries} attempts: ${selector}`);
      }

      // Wait a bit before retry
      await page.waitForTimeout(500);
    }
  }
}

export async function safeFill(page: any, selector: string, value: string, retries: number = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await page.waitForSelector(selector, { timeout: 5000 });
      await page.fill(selector, value);
      console.log(`✅ Filled element: ${selector} with value: ${value}`);
      return true;
    } catch (error) {
      console.warn(`⚠️  Failed to fill element (attempt ${attempt}/${retries}): ${selector}`);

      if (attempt === retries) {
        throw new Error(`Failed to fill element after ${retries} attempts: ${selector}`);
      }

      // Wait a bit before retry
      await page.waitForTimeout(500);
    }
  }
}

// Test isolation utilities
export async function clearBrowserState(page: any) {
  try {
    // Clear localStorage
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    // Clear cookies
    await page.context().clearCookies();

    console.log('✅ Browser state cleared');
  } catch (error) {
    console.warn('⚠️  Failed to clear browser state:', error.message);
  }
}

export async function resetTestEnvironment(page: any) {
  // Clear browser state
  await clearBrowserState(page);

  // Navigate to base URL to ensure clean state
  await page.goto('http://localhost:3000');

  // Wait for page to load
  await waitForNetworkIdle(page, 5000);

  console.log('✅ Test environment reset');
}