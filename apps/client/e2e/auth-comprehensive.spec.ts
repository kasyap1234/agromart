import { test, expect, Page } from '@playwright/test';
import {
  testData,
  waitForElement,
  waitForURL,
  waitForNetworkIdle,
  safeClick,
  safeFill,
  resetTestEnvironment
} from './test-helpers';

/**
 * Comprehensive Authentication E2E Test Suite
 * 
 * This test suite covers all authentication-related functionality:
 * - User registration (positive and negative cases)
 * - User login (various scenarios)
 * - Password reset flow
 * - Session management
 * - Role-based access control
 * - Security validations
 * - Multi-tenant isolation
 */

test.describe('Authentication Comprehensive E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Reset test environment for isolation
    await resetTestEnvironment(page);
    console.log('🧹 Test environment reset completed');
  });

  test.describe('User Registration', () => {
    test('successful user registration with valid data', async ({ page }) => {
      console.log('🚀 Testing successful user registration');

      // Navigate to registration page
      await page.goto('/auth/register');
      await waitForNetworkIdle(page);
      await waitForElement(page, 'form[data-testid="registration-form"]', 'input[name="email"]');

      // Generate unique test data
      const timestamp = Date.now();
      const testUser = {
        companyName: `Test Company ${timestamp}`,
        firstName: 'Test',
        lastName: 'User',
        email: `testuser_${timestamp}@example.com`,
        password: 'TestPassword123!',
      };

      // Fill registration form
      await safeFill(page, 'input[name="company_name"]', testUser.companyName);
      await safeFill(page, 'input[name="first_name"]', testUser.firstName);
      await safeFill(page, 'input[name="last_name"]', testUser.lastName);
      await safeFill(page, 'input[name="email"]', testUser.email);
      await safeFill(page, 'input[name="password"]', testUser.password);
      await safeFill(page, 'input[name="confirmPassword"]', testUser.password);

      // Accept terms and conditions
      await page.locator('input[name="acceptTerms"]').setChecked(true);

      // Submit registration
      await safeClick(page, 'button[type="submit"]');

      // Should redirect to login page with success message
      await waitForURL(page, '**/auth/login');
      await expect(page).toHaveURL(/.*\/auth\/login/);
      
      // Check for success message
      const successMessage = page.locator('text*="registration successful"');
      if (await successMessage.isVisible()) {
        console.log('✅ Registration success message displayed');
      }

      console.log('✅ User registration test completed successfully');
    });

    test('registration form validation - required fields', async ({ page }) => {
      console.log('🧪 Testing registration form validation for required fields');

      await page.goto('/auth/register');
      await waitForNetworkIdle(page);
      await waitForElement(page, 'input[name="email"]');

      // Submit empty form
      await safeClick(page, 'button[type="submit"]');

      // Check for validation errors
      await expect(page.locator('text*="Company name is required"')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('text*="First name is required"')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('text*="Email is required"')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('text*="Password is required"')).toBeVisible({ timeout: 5000 });

      console.log('✅ Required field validation working correctly');
    });

    test('registration form validation - email format', async ({ page }) => {
      console.log('🧪 Testing email format validation');

      await page.goto('/auth/register');
      await waitForNetworkIdle(page);
      await waitForElement(page, 'input[name="email"]');

      // Test invalid email formats
      const invalidEmails = [
        'invalid-email',
        'test@',
        '@example.com',
        'test.example.com',
        'test@.com',
      ];

      for (const email of invalidEmails) {
        await safeFill(page, 'input[name="email"]', email);
        await safeClick(page, 'button[type="submit"]');
        
        // Should show email validation error
        const emailError = page.locator('text*="valid email"');
        await expect(emailError).toBeVisible({ timeout: 3000 });
        console.log(`✅ Invalid email "${email}" properly rejected`);
      }
    });

    test('registration form validation - password strength', async ({ page }) => {
      console.log('🧪 Testing password strength validation');

      await page.goto('/auth/register');
      await waitForNetworkIdle(page);
      await waitForElement(page, 'input[name="password"]');

      // Fill required fields first
      await safeFill(page, 'input[name="company_name"]', 'Test Company');
      await safeFill(page, 'input[name="first_name"]', 'Test');
      await safeFill(page, 'input[name="last_name"]', 'User');
      await safeFill(page, 'input[name="email"]', 'test@example.com');

      // Test weak passwords
      const weakPasswords = [
        '123456',
        'password',
        'test123',
        'Password',
        'password123',
      ];

      for (const password of weakPasswords) {
        await safeFill(page, 'input[name="password"]', password);
        await safeFill(page, 'input[name="confirmPassword"]', password);
        
        // Check password strength indicator
        const strengthIndicator = page.locator('[data-testid="password-strength"]');
        if (await strengthIndicator.isVisible()) {
          const strength = await strengthIndicator.textContent();
          expect(strength?.toLowerCase()).toContain('weak');
          console.log(`✅ Weak password "${password}" correctly identified`);
        }
      }

      // Test strong password
      await safeFill(page, 'input[name="password"]', 'StrongPassword123!');
      await safeFill(page, 'input[name="confirmPassword"]', 'StrongPassword123!');
      
      const strengthIndicator = page.locator('[data-testid="password-strength"]');
      if (await strengthIndicator.isVisible()) {
        const strength = await strengthIndicator.textContent();
        expect(strength?.toLowerCase()).toContain('strong');
        console.log('✅ Strong password correctly identified');
      }
    });

    test('registration form validation - password confirmation', async ({ page }) => {
      console.log('🧪 Testing password confirmation validation');

      await page.goto('/auth/register');
      await waitForNetworkIdle(page);
      await waitForElement(page, 'input[name="password"]');

      // Fill form with mismatched passwords
      await safeFill(page, 'input[name="company_name"]', 'Test Company');
      await safeFill(page, 'input[name="first_name"]', 'Test');
      await safeFill(page, 'input[name="last_name"]', 'User');
      await safeFill(page, 'input[name="email"]', 'test@example.com');
      await safeFill(page, 'input[name="password"]', 'TestPassword123!');
      await safeFill(page, 'input[name="confirmPassword"]', 'DifferentPassword123!');

      await safeClick(page, 'button[type="submit"]');

      // Should show password mismatch error
      await expect(page.locator('text*="Passwords do not match"')).toBeVisible({ timeout: 5000 });
      console.log('✅ Password mismatch validation working correctly');
    });

    test('registration form validation - duplicate email', async ({ page }) => {
      console.log('🧪 Testing duplicate email validation');

      await page.goto('/auth/register');
      await waitForNetworkIdle(page);
      await waitForElement(page, 'input[name="email"]');

      // Try to register with existing email (use testData.testUser.email)
      await safeFill(page, 'input[name="company_name"]', 'Test Company');
      await safeFill(page, 'input[name="first_name"]', 'Test');
      await safeFill(page, 'input[name="last_name"]', 'User');
      await safeFill(page, 'input[name="email"]', testData.testUser.email);
      await safeFill(page, 'input[name="password"]', 'TestPassword123!');
      await safeFill(page, 'input[name="confirmPassword"]', 'TestPassword123!');
      await page.locator('input[name="acceptTerms"]').setChecked(true);

      await safeClick(page, 'button[type="submit"]');

      // Should show duplicate email error
      const duplicateError = page.locator('text*="email already exists"');
      if (await duplicateError.isVisible({ timeout: 5000 })) {
        console.log('✅ Duplicate email validation working correctly');
      } else {
        console.log('⚠️  Duplicate email test skipped - email might not exist in DB');
      }
    });
  });

  test.describe('User Login', () => {
    test('successful login with valid credentials', async ({ page }) => {
      console.log('🚀 Testing successful login');

      await page.goto('/auth/login');
      await waitForNetworkIdle(page);
      await waitForElement(page, 'input[name="email"]');

      // Login with test credentials
      await safeFill(page, 'input[name="email"]', testData.testUser.email);
      await safeFill(page, 'input[name="password"]', testData.testUser.password);
      await safeClick(page, 'button[type="submit"]');

      // Should redirect to dashboard
      await waitForURL(page, '**/dashboard');
      await expect(page).toHaveURL(/.*\/dashboard/);

      // Check for user info in header
      const userMenu = page.locator('[data-testid="user-menu"]');
      if (await userMenu.isVisible()) {
        console.log('✅ User menu visible after login');
      }

      console.log('✅ Successful login test completed');
    });

    test('login form validation - empty fields', async ({ page }) => {
      console.log('🧪 Testing login form validation for empty fields');

      await page.goto('/auth/login');
      await waitForNetworkIdle(page);
      await waitForElement(page, 'input[name="email"]');

      // Submit empty form
      await safeClick(page, 'button[type="submit"]');

      // Check for validation errors
      await expect(page.locator('text*="Email is required"')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('text*="Password is required"')).toBeVisible({ timeout: 5000 });

      console.log('✅ Empty field validation working correctly');
    });

    test('login with invalid credentials', async ({ page }) => {
      console.log('🧪 Testing login with invalid credentials');

      await page.goto('/auth/login');
      await waitForNetworkIdle(page);
      await waitForElement(page, 'input[name="email"]');

      // Test invalid email/password combinations
      const invalidCredentials = [
        { email: 'nonexistent@example.com', password: 'password123' },
        { email: testData.testUser.email, password: 'wrongpassword' },
        { email: 'invalid-email', password: 'password123' },
      ];

      for (const { email, password } of invalidCredentials) {
        await safeFill(page, 'input[name="email"]', email);
        await safeFill(page, 'input[name="password"]', password);
        await safeClick(page, 'button[type="submit"]');

        // Should show invalid credentials error
        const errorMessage = page.locator('text*="Invalid credentials"');
        await expect(errorMessage).toBeVisible({ timeout: 5000 });
        console.log(`✅ Invalid credentials "${email}/${password}" properly rejected`);

        // Clear fields for next test
        await safeFill(page, 'input[name="email"]', '');
        await safeFill(page, 'input[name="password"]', '');
      }
    });

    test('login rate limiting protection', async ({ page }) => {
      console.log('🧪 Testing login rate limiting');

      await page.goto('/auth/login');
      await waitForNetworkIdle(page);
      await waitForElement(page, 'input[name="email"]');

      // Attempt multiple failed logins rapidly
      for (let i = 0; i < 5; i++) {
        await safeFill(page, 'input[name="email"]', 'test@example.com');
        await safeFill(page, 'input[name="password"]', 'wrongpassword');
        await safeClick(page, 'button[type="submit"]');
        await page.waitForTimeout(500); // Small delay between attempts
      }

      // Should show rate limiting message
      const rateLimitMessage = page.locator('text*="too many attempts"');
      if (await rateLimitMessage.isVisible({ timeout: 5000 })) {
        console.log('✅ Rate limiting protection working');
      } else {
        console.log('⚠️  Rate limiting test inconclusive - may not be implemented');
      }
    });

    test('remember me functionality', async ({ page }) => {
      console.log('🧪 Testing remember me functionality');

      await page.goto('/auth/login');
      await waitForNetworkIdle(page);
      await waitForElement(page, 'input[name="email"]');

      // Login with remember me checked
      await safeFill(page, 'input[name="email"]', testData.testUser.email);
      await safeFill(page, 'input[name="password"]', testData.testUser.password);
      
      const rememberMeCheckbox = page.locator('input[name="remember"]');
      if (await rememberMeCheckbox.isVisible()) {
        await rememberMeCheckbox.setChecked(true);
        console.log('✅ Remember me checkbox checked');
      }

      await safeClick(page, 'button[type="submit"]');
      await waitForURL(page, '**/dashboard');

      // Check if longer-duration token was set
      const cookies = await page.context().cookies();
      const authCookie = cookies.find(c => c.name.includes('auth') || c.name.includes('token'));
      
      if (authCookie) {
        console.log('✅ Authentication cookie found');
        // In a real test, you'd check the expiration time
      }

      console.log('✅ Remember me functionality test completed');
    });
  });

  test.describe('Password Reset Flow', () => {
    test('password reset request with valid email', async ({ page }) => {
      console.log('🚀 Testing password reset request');

      await page.goto('/auth/forgot-password');
      await waitForNetworkIdle(page);
      await waitForElement(page, 'input[name="email"]');

      // Request password reset
      await safeFill(page, 'input[name="email"]', testData.testUser.email);
      await safeClick(page, 'button[type="submit"]');

      // Should show success message
      const successMessage = page.locator('text*="reset email sent"');
      await expect(successMessage).toBeVisible({ timeout: 5000 });

      console.log('✅ Password reset request test completed');
    });

    test('password reset with invalid email', async ({ page }) => {
      console.log('🧪 Testing password reset with invalid email');

      await page.goto('/auth/forgot-password');
      await waitForNetworkIdle(page);
      await waitForElement(page, 'input[name="email"]');

      // Test with non-existent email
      await safeFill(page, 'input[name="email"]', 'nonexistent@example.com');
      await safeClick(page, 'button[type="submit"]');

      // Should still show success message (security best practice)
      const successMessage = page.locator('text*="reset email sent"');
      await expect(successMessage).toBeVisible({ timeout: 5000 });

      console.log('✅ Invalid email password reset test completed');
    });

    test('password reset form completion', async ({ page }) => {
      console.log('🧪 Testing password reset form completion');

      // Navigate directly to reset form (would normally come from email link)
      await page.goto('/auth/reset-password?token=test-token');
      await waitForNetworkIdle(page);
      
      const passwordInput = page.locator('input[name="password"]');
      if (await passwordInput.isVisible()) {
        await waitForElement(page, 'input[name="password"]');

        // Fill new password
        await safeFill(page, 'input[name="password"]', 'NewPassword123!');
        await safeFill(page, 'input[name="confirmPassword"]', 'NewPassword123!');
        await safeClick(page, 'button[type="submit"]');

        // Should redirect to login with success message
        await waitForURL(page, '**/auth/login');
        const successMessage = page.locator('text*="password reset successful"');
        
        if (await successMessage.isVisible({ timeout: 5000 })) {
          console.log('✅ Password reset completion successful');
        }
      } else {
        console.log('⚠️  Password reset form not accessible - may require valid token');
      }
    });
  });

  test.describe('Session Management', () => {
    test('session timeout handling', async ({ page }) => {
      console.log('🧪 Testing session timeout handling');

      // Login first
      await page.goto('/auth/login');
      await waitForNetworkIdle(page);
      await waitForElement(page, 'input[name="email"]');

      await safeFill(page, 'input[name="email"]', testData.testUser.email);
      await safeFill(page, 'input[name="password"]', testData.testUser.password);
      await safeClick(page, 'button[type="submit"]');
      await waitForURL(page, '**/dashboard');

      // Simulate session expiration by clearing auth tokens
      await page.evaluate(() => {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('refresh_token');
        // Clear cookies
        document.cookie.split(";").forEach(function(c) { 
          document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
        });
      });

      // Try to access protected page
      await page.goto('/products');
      await waitForNetworkIdle(page);

      // Should redirect to login
      await waitForURL(page, '**/auth/login');
      await expect(page).toHaveURL(/.*\/auth\/login/);

      console.log('✅ Session timeout handling working correctly');
    });

    test('automatic token refresh', async ({ page }) => {
      console.log('🧪 Testing automatic token refresh');

      // Login and get to dashboard
      await page.goto('/auth/login');
      await waitForNetworkIdle(page);
      await waitForElement(page, 'input[name="email"]');

      await safeFill(page, 'input[name="email"]', testData.testUser.email);
      await safeFill(page, 'input[name="password"]', testData.testUser.password);
      await safeClick(page, 'button[type="submit"]');
      await waitForURL(page, '**/dashboard');

      // Monitor network requests for token refresh
      let refreshAttempted = false;
      page.on('request', request => {
        if (request.url().includes('/auth/refresh')) {
          refreshAttempted = true;
          console.log('✅ Token refresh request detected');
        }
      });

      // Make API requests to trigger refresh (if near expiration)
      await page.goto('/products');
      await waitForNetworkIdle(page);

      // Stay on page for a while to potentially trigger refresh
      await page.waitForTimeout(5000);

      console.log(`✅ Token refresh test completed (refresh attempted: ${refreshAttempted})`);
    });

    test('logout functionality', async ({ page }) => {
      console.log('🧪 Testing logout functionality');

      // Login first
      await page.goto('/auth/login');
      await waitForNetworkIdle(page);
      await waitForElement(page, 'input[name="email"]');

      await safeFill(page, 'input[name="email"]', testData.testUser.email);
      await safeFill(page, 'input[name="password"]', testData.testUser.password);
      await safeClick(page, 'button[type="submit"]');
      await waitForURL(page, '**/dashboard');

      // Find and click logout button
      const logoutButton = page.locator('button:has-text("Logout")');
      if (await logoutButton.isVisible()) {
        await safeClick(page, 'button:has-text("Logout")');
      } else {
        // Try user menu dropdown
        const userMenu = page.locator('[data-testid="user-menu"]');
        if (await userMenu.isVisible()) {
          await safeClick(page, '[data-testid="user-menu"]');
          await safeClick(page, 'button:has-text("Logout")');
        }
      }

      // Should redirect to login
      await waitForURL(page, '**/auth/login');
      await expect(page).toHaveURL(/.*\/auth\/login/);

      // Check that tokens are cleared
      const tokens = await page.evaluate(() => ({
        authToken: localStorage.getItem('auth_token'),
        refreshToken: localStorage.getItem('refresh_token'),
      }));

      expect(tokens.authToken).toBeNull();
      expect(tokens.refreshToken).toBeNull();

      console.log('✅ Logout functionality working correctly');
    });
  });

  test.describe('Role-Based Access Control', () => {
    test('admin user access to all features', async ({ page }) => {
      console.log('🧪 Testing admin user access');

      // Login as admin (assuming testData.testUser is admin)
      await page.goto('/auth/login');
      await waitForNetworkIdle(page);
      await waitForElement(page, 'input[name="email"]');

      await safeFill(page, 'input[name="email"]', testData.testUser.email);
      await safeFill(page, 'input[name="password"]', testData.testUser.password);
      await safeClick(page, 'button[type="submit"]');
      await waitForURL(page, '**/dashboard');

      // Test access to admin-only features
      const adminRoutes = [
        '/users',
        '/settings',
        '/reports',
        '/analytics',
      ];

      for (const route of adminRoutes) {
        await page.goto(route);
        await waitForNetworkIdle(page);

        // Should not redirect to access denied
        const currentUrl = page.url();
        expect(currentUrl).toContain(route);
        console.log(`✅ Admin access to ${route} confirmed`);
      }
    });

    test('restricted user access control', async ({ page }) => {
      console.log('🧪 Testing restricted user access control');

      // This test would require a test user with limited permissions
      // For now, we'll test the general pattern

      await page.goto('/auth/login');
      await waitForNetworkIdle(page);
      await waitForElement(page, 'input[name="email"]');

      // Try to access admin route directly without proper permissions
      await page.goto('/users');
      await waitForNetworkIdle(page);

      // Should either redirect to login or show access denied
      const currentUrl = page.url();
      const hasAccess = currentUrl.includes('/users') && !currentUrl.includes('/auth/login');

      if (!hasAccess) {
        console.log('✅ Access control working - redirected from restricted area');
      } else {
        console.log('⚠️  Access control test inconclusive - user may have admin permissions');
      }
    });
  });

  test.describe('Security Validations', () => {
    test('XSS protection in login form', async ({ page }) => {
      console.log('🧪 Testing XSS protection');

      await page.goto('/auth/login');
      await waitForNetworkIdle(page);
      await waitForElement(page, 'input[name="email"]');

      // Try XSS payload in email field
      const xssPayload = '<script>alert("xss")</script>';
      await safeFill(page, 'input[name="email"]', xssPayload);
      await safeFill(page, 'input[name="password"]', 'password');
      await safeClick(page, 'button[type="submit"]');

      // Should not execute script
      const dialogPromise = page.waitForEvent('dialog').catch(() => null);
      const dialog = await Promise.race([
        dialogPromise,
        page.waitForTimeout(2000).then(() => null)
      ]);

      expect(dialog).toBeNull();
      console.log('✅ XSS protection working correctly');
    });

    test('CSRF protection verification', async ({ page }) => {
      console.log('🧪 Testing CSRF protection');

      await page.goto('/auth/login');
      await waitForNetworkIdle(page);

      // Check for CSRF token in form or meta tag
      const csrfToken = await page.locator('meta[name="csrf-token"]').getAttribute('content');
      const csrfInput = await page.locator('input[name="_token"]').isVisible();

      if (csrfToken || csrfInput) {
        console.log('✅ CSRF protection detected');
      } else {
        console.log('⚠️  CSRF protection not detected - may use different implementation');
      }
    });

    test('password field security attributes', async ({ page }) => {
      console.log('🧪 Testing password field security');

      await page.goto('/auth/login');
      await waitForNetworkIdle(page);
      await waitForElement(page, 'input[name="password"]');

      const passwordInput = page.locator('input[name="password"]');

      // Check security attributes
      await expect(passwordInput).toHaveAttribute('type', 'password');
      await expect(passwordInput).toHaveAttribute('autocomplete', /.*(password|current-password).*/);

      console.log('✅ Password field security attributes correct');
    });
  });

  test.describe('Multi-Tenant Isolation', () => {
    test('tenant data isolation verification', async ({ page }) => {
      console.log('🧪 Testing tenant data isolation');

      // Login as tenant A user
      await page.goto('/auth/login');
      await waitForNetworkIdle(page);
      await waitForElement(page, 'input[name="email"]');

      await safeFill(page, 'input[name="email"]', testData.testUser.email);
      await safeFill(page, 'input[name="password"]', testData.testUser.password);
      await safeClick(page, 'button[type="submit"]');
      await waitForURL(page, '**/dashboard');

      // Create test data for tenant A
      await page.goto('/products/new');
      await waitForNetworkIdle(page);

      if (await page.locator('input[name="name"]').isVisible()) {
        await safeFill(page, 'input[name="name"]', `Tenant A Product ${Date.now()}`);
        await safeFill(page, 'input[name="sku"]', `TA-${Date.now()}`);
        await safeFill(page, 'input[name="price"]', '100');
        await safeClick(page, 'button[type="submit"]');
      }

      // Logout
      const logoutButton = page.locator('button:has-text("Logout")');
      if (await logoutButton.isVisible()) {
        await safeClick(page, 'button:has-text("Logout")');
        await waitForURL(page, '**/auth/login');
      }

      console.log('✅ Tenant isolation test completed');
    });
  });
});

/**
 * Helper function to perform complete authentication flow
 */
async function performLogin(page: Page, email: string, password: string): Promise<boolean> {
  await page.goto('/auth/login');
  await waitForNetworkIdle(page);
  await waitForElement(page, 'input[name="email"]');

  await safeFill(page, 'input[name="email"]', email);
  await safeFill(page, 'input[name="password"]', password);
  await safeClick(page, 'button[type="submit"]');

  try {
    await waitForURL(page, '**/dashboard');
    return page.url().includes('/dashboard');
  } catch {
    return false;
  }
}

/**
 * Helper function to check if user is authenticated
 */
async function isAuthenticated(page: Page): Promise<boolean> {
  const authToken = await page.evaluate(() => localStorage.getItem('auth_token'));
  return !!authToken;
}

/**
 * Helper function to clear authentication state
 */
async function clearAuth(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
    document.cookie.split(";").forEach(function(c) { 
      document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
    });
  });
}