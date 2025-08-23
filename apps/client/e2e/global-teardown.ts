import { FullConfig } from '@playwright/test';
import { cleanupTestDatabase } from './test-helpers';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Cleaning up E2E test environment...');

  // Clean up test database
  await cleanupTestDatabase();

  console.log('✅ E2E test environment cleanup complete');
}

export default globalTeardown;