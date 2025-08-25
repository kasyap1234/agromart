import { test, expect, Page } from '@playwright/test';
import { promises as fs } from 'fs';
import path from 'path';

// Test configuration for file upload scenarios
const TEST_CONFIG = {
  baseURL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  apiURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080',
  timeout: 30000,
  testImages: {
    small: path.join(__dirname, 'fixtures', 'test-image-small.png'),
    large: path.join(__dirname, 'fixtures', 'test-image-large.jpg'),
    invalid: path.join(__dirname, 'fixtures', 'test-document.txt'),
  }
};

// Helper functions for authentication
async function loginUser(page: Page, email: string = 'admin@example.com', password: string = 'password123') {
  await page.goto(`${TEST_CONFIG.baseURL}/auth/login`);
  await page.fill('[data-testid="email-input"]', email);
  await page.fill('[data-testid="password-input"]', password);
  await page.click('[data-testid="login-button"]');
  await page.waitForURL('**/dashboard', { timeout: 10000 });
}

async function createTestUser(page: Page) {
  const uniqueEmail = `test-${Date.now()}@example.com`;
  await page.goto(`${TEST_CONFIG.baseURL}/auth/register`);
  
  await page.fill('[data-testid="name-input"]', 'Test User');
  await page.fill('[data-testid="email-input"]', uniqueEmail);
  await page.fill('[data-testid="password-input"]', 'TestPassword123!');
  await page.fill('[data-testid="confirm-password-input"]', 'TestPassword123!');
  await page.click('[data-testid="register-button"]');
  
  // Wait for successful registration
  await page.waitForSelector('[data-testid="success-message"]', { timeout: 10000 });
  return uniqueEmail;
}

// Helper function to create test images
async function createTestImages() {
  const fixturesDir = path.join(__dirname, 'fixtures');
  
  // Ensure fixtures directory exists
  try {
    await fs.access(fixturesDir);
  } catch {
    await fs.mkdir(fixturesDir, { recursive: true });
  }
  
  // Create small test image (1KB PNG)
  const smallImageData = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG header
    0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1 pixel
    0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE,
    0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41, 0x54, // IDAT chunk
    0x08, 0xD7, 0x63, 0xF8, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01,
    0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82 // IEND
  ]);
  
  await fs.writeFile(TEST_CONFIG.testImages.small, smallImageData);
  
  // Create text file for invalid type testing
  await fs.writeFile(TEST_CONFIG.testImages.invalid, 'This is a test document');
  
  // Create larger image data (simulated)
  const largeImageData = Buffer.concat([
    smallImageData,
    Buffer.alloc(5 * 1024 * 1024, 0xFF) // 5MB padding
  ]);
  
  await fs.writeFile(TEST_CONFIG.testImages.large, largeImageData);
}

test.describe('File Upload Integration Tests', () => {
  test.beforeAll(async () => {
    // Create test fixtures
    await createTestImages();
  });

  test.beforeEach(async ({ page }) => {
    // Set up default timeouts
    page.setDefaultTimeout(TEST_CONFIG.timeout);
  });

  test.describe('Authentication Flow', () => {
    test('should register new user and access file upload', async ({ page }) => {
      const email = await createTestUser(page);
      
      // Login with new user
      await page.goto(`${TEST_CONFIG.baseURL}/auth/login`);
      await page.fill('[data-testid="email-input"]', email);
      await page.fill('[data-testid="password-input"]', 'TestPassword123!');
      await page.click('[data-testid="login-button"]');
      
      // Verify dashboard access
      await expect(page).toHaveURL(/.*dashboard/);
      
      // Navigate to file upload demo
      await page.goto(`${TEST_CONFIG.baseURL}/file-upload-demo`);
      await expect(page.locator('[data-testid="file-upload-area"]')).toBeVisible();
    });

    test('should prevent unauthenticated file upload access', async ({ page }) => {
      await page.goto(`${TEST_CONFIG.baseURL}/file-upload-demo`);
      
      // Should redirect to login
      await expect(page).toHaveURL(/.*auth\/login/);
    });
  });

  test.describe('File Upload Functionality', () => {
    test.beforeEach(async ({ page }) => {
      await loginUser(page);
      await page.goto(`${TEST_CONFIG.baseURL}/file-upload-demo`);
    });

    test('should upload small image successfully', async ({ page }) => {
      // Wait for upload area to be visible
      await expect(page.locator('[data-testid="file-upload-area"]')).toBeVisible();
      
      // Upload file
      const fileInput = page.locator('input[type="file"]').first();
      await fileInput.setInputFiles(TEST_CONFIG.testImages.small);
      
      // Verify file appears in preview
      await expect(page.locator('[data-testid="file-preview"]')).toBeVisible();
      await expect(page.locator('text=test-image-small.png')).toBeVisible();
      
      // Click upload button
      await page.click('[data-testid="upload-button"]');
      
      // Wait for upload completion
      await expect(page.locator('[data-testid="upload-success"]')).toBeVisible({ timeout: 15000 });
      
      // Verify success message
      await expect(page.locator('text=File uploaded successfully')).toBeVisible();
      
      // Verify file appears in uploaded files list
      await expect(page.locator('[data-testid="uploaded-files-list"]')).toContainText('test-image-small.png');
    });

    test('should handle large file upload with progress tracking', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]').first();
      await fileInput.setInputFiles(TEST_CONFIG.testImages.large);
      
      await page.click('[data-testid="upload-button"]');
      
      // Verify progress indicator appears
      await expect(page.locator('[data-testid="upload-progress"]')).toBeVisible();
      
      // Wait for completion or timeout
      const result = await Promise.race([
        page.locator('[data-testid="upload-success"]').waitFor({ timeout: 60000 }),
        page.locator('[data-testid="upload-error"]').waitFor({ timeout: 60000 })
      ]);
      
      // Should either succeed or show appropriate error for large files
      expect(result).toBeTruthy();
    });

    test('should reject invalid file types', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]').first();
      await fileInput.setInputFiles(TEST_CONFIG.testImages.invalid);
      
      // Should show validation error
      await expect(page.locator('[data-testid="file-validation-error"]')).toBeVisible();
      await expect(page.locator('text=Invalid file type')).toBeVisible();
    });

    test('should support multiple file upload', async ({ page }) => {
      // Switch to multiple upload mode
      await page.click('[data-testid="multiple-upload-toggle"]');
      
      const fileInput = page.locator('input[type="file"]').first();
      await fileInput.setInputFiles([
        TEST_CONFIG.testImages.small,
        TEST_CONFIG.testImages.small // Use same file twice for testing
      ]);
      
      // Verify both files appear
      await expect(page.locator('[data-testid="file-preview"]')).toHaveCount(2);
      
      await page.click('[data-testid="upload-all-button"]');
      
      // Wait for all uploads to complete
      await expect(page.locator('[data-testid="upload-success"]')).toBeVisible({ timeout: 30000 });
    });

    test('should handle upload cancellation', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]').first();
      await fileInput.setInputFiles(TEST_CONFIG.testImages.large);
      
      await page.click('[data-testid="upload-button"]');
      
      // Immediately cancel upload
      await page.click('[data-testid="cancel-upload-button"]');
      
      // Verify cancellation
      await expect(page.locator('[data-testid="upload-cancelled"]')).toBeVisible();
    });
  });

  test.describe('Avatar Upload Functionality', () => {
    test.beforeEach(async ({ page }) => {
      await loginUser(page);
      await page.goto(`${TEST_CONFIG.baseURL}/file-upload-demo`);
      await page.click('[data-testid="avatar-upload-tab"]');
    });

    test('should upload avatar successfully', async ({ page }) => {
      // Click on avatar upload area
      await page.click('[data-testid="avatar-upload-area"]');
      
      // Upload image
      const fileInput = page.locator('input[type="file"]').first();
      await fileInput.setInputFiles(TEST_CONFIG.testImages.small);
      
      // Verify preview appears
      await expect(page.locator('[data-testid="avatar-preview"]')).toBeVisible();
      
      // Wait for automatic upload completion
      await expect(page.locator('[data-testid="avatar-upload-success"]')).toBeVisible({ timeout: 15000 });
    });

    test('should allow avatar replacement', async ({ page }) => {
      // Upload first avatar
      await page.click('[data-testid="avatar-upload-area"]');
      const fileInput = page.locator('input[type="file"]').first();
      await fileInput.setInputFiles(TEST_CONFIG.testImages.small);
      await expect(page.locator('[data-testid="avatar-upload-success"]')).toBeVisible({ timeout: 15000 });
      
      // Replace with new avatar
      await page.click('[data-testid="avatar-upload-area"]');
      await fileInput.setInputFiles(TEST_CONFIG.testImages.small);
      await expect(page.locator('[data-testid="avatar-upload-success"]')).toBeVisible({ timeout: 15000 });
      
      // Verify replacement was successful
      await expect(page.locator('[data-testid="avatar-preview"]')).toBeVisible();
    });
  });

  test.describe('Product Image Upload', () => {
    test.beforeEach(async ({ page }) => {
      await loginUser(page);
      await page.goto(`${TEST_CONFIG.baseURL}/products`);
    });

    test('should upload product images during product creation', async ({ page }) => {
      // Click create new product
      await page.click('[data-testid="create-product-button"]');
      
      // Fill basic product information
      await page.fill('[data-testid="product-name-input"]', 'Test Product');
      await page.fill('[data-testid="product-price-input"]', '99.99');
      await page.fill('[data-testid="product-description-input"]', 'Test product description');
      
      // Upload product image
      const fileInput = page.locator('[data-testid="product-image-upload"] input[type="file"]');
      await fileInput.setInputFiles(TEST_CONFIG.testImages.small);
      
      // Verify image preview
      await expect(page.locator('[data-testid="product-image-preview"]')).toBeVisible();
      
      // Save product
      await page.click('[data-testid="save-product-button"]');
      
      // Verify product creation success
      await expect(page.locator('[data-testid="product-creation-success"]')).toBeVisible();
      
      // Verify product appears in list with image
      await expect(page.locator('[data-testid="product-list-item"]')).toContainText('Test Product');
      await expect(page.locator('[data-testid="product-list-item"] img')).toBeVisible();
    });
  });

  test.describe('Error Handling and Edge Cases', () => {
    test.beforeEach(async ({ page }) => {
      await loginUser(page);
      await page.goto(`${TEST_CONFIG.baseURL}/file-upload-demo`);
    });

    test('should handle network disconnection gracefully', async ({ page }) => {
      // Start file upload
      const fileInput = page.locator('input[type="file"]').first();
      await fileInput.setInputFiles(TEST_CONFIG.testImages.small);
      
      // Simulate network disconnection
      await page.context().setOffline(true);
      
      await page.click('[data-testid="upload-button"]');
      
      // Should show network error
      await expect(page.locator('[data-testid="upload-error"]')).toBeVisible();
      await expect(page.locator('text=Network error')).toBeVisible();
      
      // Restore network
      await page.context().setOffline(false);
      
      // Retry upload
      await page.click('[data-testid="retry-upload-button"]');
      await expect(page.locator('[data-testid="upload-success"]')).toBeVisible({ timeout: 15000 });
    });

    test('should handle server errors gracefully', async ({ page }) => {
      // Mock server error response
      await page.route('**/api/files/upload', async route => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ success: false, message: 'Internal server error' })
        });
      });
      
      const fileInput = page.locator('input[type="file"]').first();
      await fileInput.setInputFiles(TEST_CONFIG.testImages.small);
      await page.click('[data-testid="upload-button"]');
      
      // Should show server error
      await expect(page.locator('[data-testid="upload-error"]')).toBeVisible();
      await expect(page.locator('text=Internal server error')).toBeVisible();
    });

    test('should validate file size limits', async ({ page }) => {
      // Mock file size validation
      const fileInput = page.locator('input[type="file"]').first();
      await fileInput.setInputFiles(TEST_CONFIG.testImages.large);
      
      // Should show size validation error
      await expect(page.locator('[data-testid="file-size-error"]')).toBeVisible();
      await expect(page.locator('text=File size exceeds maximum')).toBeVisible();
    });

    test('should handle concurrent uploads', async ({ page }) => {
      // Switch to multiple upload mode
      await page.click('[data-testid="multiple-upload-toggle"]');
      
      // Add multiple files
      const fileInput = page.locator('input[type="file"]').first();
      await fileInput.setInputFiles([
        TEST_CONFIG.testImages.small,
        TEST_CONFIG.testImages.small,
        TEST_CONFIG.testImages.small
      ]);
      
      // Start concurrent uploads
      await page.click('[data-testid="upload-all-button"]');
      
      // Verify all uploads complete
      await expect(page.locator('[data-testid="upload-success"]')).toBeVisible({ timeout: 30000 });
      await expect(page.locator('[data-testid="uploaded-files-list"] [data-testid="file-item"]')).toHaveCount(3);
    });
  });

  test.describe('File Management', () => {
    test.beforeEach(async ({ page }) => {
      await loginUser(page);
      await page.goto(`${TEST_CONFIG.baseURL}/file-upload-demo`);
    });

    test('should delete uploaded files', async ({ page }) => {
      // Upload a file first
      const fileInput = page.locator('input[type="file"]').first();
      await fileInput.setInputFiles(TEST_CONFIG.testImages.small);
      await page.click('[data-testid="upload-button"]');
      await expect(page.locator('[data-testid="upload-success"]')).toBeVisible();
      
      // Delete the file
      await page.click('[data-testid="delete-file-button"]');
      
      // Confirm deletion
      await page.click('[data-testid="confirm-delete-button"]');
      
      // Verify file is removed
      await expect(page.locator('[data-testid="file-deleted-success"]')).toBeVisible();
      await expect(page.locator('[data-testid="uploaded-files-list"]')).not.toContainText('test-image-small.png');
    });

    test('should download uploaded files', async ({ page }) => {
      // Upload a file first
      const fileInput = page.locator('input[type="file"]').first();
      await fileInput.setInputFiles(TEST_CONFIG.testImages.small);
      await page.click('[data-testid="upload-button"]');
      await expect(page.locator('[data-testid="upload-success"]')).toBeVisible();
      
      // Start download
      const downloadPromise = page.waitForEvent('download');
      await page.click('[data-testid="download-file-button"]');
      const download = await downloadPromise;
      
      // Verify download
      expect(download.suggestedFilename()).toContain('test-image-small.png');
    });
  });

  test.describe('MinIO Integration Validation', () => {
    test('should verify files are stored in MinIO', async ({ page }) => {
      await loginUser(page);
      await page.goto(`${TEST_CONFIG.baseURL}/file-upload-demo`);
      
      // Upload file
      const fileInput = page.locator('input[type="file"]').first();
      await fileInput.setInputFiles(TEST_CONFIG.testImages.small);
      await page.click('[data-testid="upload-button"]');
      await expect(page.locator('[data-testid="upload-success"]')).toBeVisible();
      
      // Verify file URL points to MinIO
      const fileUrl = await page.locator('[data-testid="file-url"]').textContent();
      expect(fileUrl).toContain('localhost:9000'); // MinIO default port
      
      // Verify file is accessible
      const response = await page.request.get(fileUrl || '');
      expect(response.status()).toBe(200);
    });

    test('should handle MinIO connection failures', async ({ page }) => {
      await loginUser(page);
      await page.goto(`${TEST_CONFIG.baseURL}/file-upload-demo`);
      
      // Mock MinIO connection failure
      await page.route('**/api/files/upload', async route => {
        await route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({ 
            success: false, 
            message: 'Storage service temporarily unavailable' 
          })
        });
      });
      
      const fileInput = page.locator('input[type="file"]').first();
      await fileInput.setInputFiles(TEST_CONFIG.testImages.small);
      await page.click('[data-testid="upload-button"]');
      
      // Should show storage error
      await expect(page.locator('[data-testid="upload-error"]')).toBeVisible();
      await expect(page.locator('text=Storage service temporarily unavailable')).toBeVisible();
    });
  });

  test.describe('Performance and Load Testing', () => {
    test('should handle rapid successive uploads', async ({ page }) => {
      await loginUser(page);
      await page.goto(`${TEST_CONFIG.baseURL}/file-upload-demo`);
      
      const numUploads = 5;
      const uploadPromises: Promise<void>[] = [];
      
      for (let i = 0; i < numUploads; i++) {
        const uploadPromise = (async () => {
          const fileInput = page.locator('input[type="file"]').first();
          await fileInput.setInputFiles(TEST_CONFIG.testImages.small);
          await page.click('[data-testid="upload-button"]');
          await expect(page.locator('[data-testid="upload-success"]')).toBeVisible();
        })();
        
        uploadPromises.push(uploadPromise);
      }
      
      // Wait for all uploads to complete
      await Promise.all(uploadPromises);
      
      // Verify all files were uploaded
      await expect(page.locator('[data-testid="uploaded-files-list"] [data-testid="file-item"]')).toHaveCount(numUploads);
    });
  });

  test.afterAll(async () => {
    // Cleanup test fixtures
    try {
      await fs.unlink(TEST_CONFIG.testImages.small);
      await fs.unlink(TEST_CONFIG.testImages.large);
      await fs.unlink(TEST_CONFIG.testImages.invalid);
      await fs.rmdir(path.join(__dirname, 'fixtures'));
    } catch (error) {
      console.warn('Could not clean up test fixtures:', error);
    }
  });
});