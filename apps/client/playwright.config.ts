import { defineConfig, devices } from '@playwright/test';

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 1,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: process.env.CI ? [
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['github'],
    ['dot']
  ] : [
    ['html'],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['line']
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.BASE_URL || 'http://localhost:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'retain-on-failure',

    /* Screenshot settings - only on CI for performance */
    screenshot: process.env.CI ? 'only-on-failure' : 'on',

    /* Video recording - only on failure to save space */
    video: 'retain-on-failure',

    /* Action timeout for individual actions like click, fill, etc. */
    actionTimeout: 15 * 1000,

    /* Navigation timeout for page.goto, page.reload, etc. */
    navigationTimeout: process.env.CI ? 60 * 1000 : 30 * 1000,

    /* Ensure each test runs in isolation */
    storageState: undefined,

    /* CI-specific settings */
    ...(process.env.CI && {
      headless: true,
      viewport: { width: 1280, height: 720 },
    }),
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    /* Test against mobile viewports. */
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Run your local dev server before starting the tests */
  webServer: [
    {
      command: 'bun run dev',
      port: 3000,
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
    },
    // Temporarily disabled server startup due to database connection issues
    // {
    //   command: 'cd ../server && ./server',
    //   port: 8080,
    //   reuseExistingServer: !process.env.CI,
    //   timeout: 120 * 1000,
    // },
  ],

  /* Global Setup and Teardown */
  globalSetup: require.resolve('./e2e/global-setup'),
  globalTeardown: require.resolve('./e2e/global-teardown'),

  /* Test timeout */
  timeout: 120 * 1000,
  expect: {
    timeout: 15 * 1000,
  },

});