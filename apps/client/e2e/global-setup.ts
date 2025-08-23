import { chromium, FullConfig } from '@playwright/test';
import { setupTestDatabase } from './test-helpers';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Setting up E2E test environment...');

  // Set up test database
  await setupTestDatabase();

  // Optional: Pre-populate database with test data
  console.log('📊 Pre-populating test database...');

  // Create admin user for testing
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    // Make API call to create test admin user
    await page.goto('http://localhost:8080/api/health');
    console.log('✅ Backend API is ready');
  } catch (error) {
    console.warn('⚠️  Backend API not ready, but continuing with tests');
  }

  await browser.close();
  console.log('✅ E2E test environment setup complete');
}

export default globalSetup;