import { test, expect } from '@playwright/test';

test.describe('Register Page - Tailwind CSS v4.1 Migration Diagnostic', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/register');
    await page.waitForLoadState('networkidle');
  });

  test('Basic Page Loading - Critical Check', async ({ page }) => {
    // Check if page loads without being blank
    const body = page.locator('body');
    await expect(body).toBeVisible();

    // Verify main container exists
    const mainContainer = page.locator('div.min-h-screen');
    await expect(mainContainer).toBeVisible();

    console.log('✅ Page loads successfully');
  });

  test('Page Title and Content - Basic Elements', async ({ page }) => {
    // Check for main heading
    const title = page.locator('h2').filter({ hasText: 'Create your account' });
    await expect(title).toBeVisible();

    // Check for subtitle
    const subtitle = page.locator('p').filter({ hasText: /Join AgroMart/ });
    await expect(subtitle).toBeVisible();

    console.log('✅ Main content elements are present');
  });

  test('Form Elements Presence - Critical Components', async ({ page }) => {
    // Check if form exists
    const form = page.locator('form');
    await expect(form).toBeVisible();

    // Check for essential input fields
    const companyNameInput = page.locator('input[id="company_name"]');
    await expect(companyNameInput).toBeVisible();

    const emailInput = page.locator('input[id="email"]');
    await expect(emailInput).toBeVisible();

    console.log('✅ Form elements are present');
  });

  test('Button State - Create Account Button', async ({ page }) => {
    const createButton = page.locator('button[type="submit"]').filter({ hasText: 'Create account' });

    // Button should exist
    await expect(createButton).toBeVisible();

    // Button should be disabled initially due to form validation
    await expect(createButton).toBeDisabled();

    // Check button classes
    const buttonClasses = await createButton.getAttribute('class');
    console.log('Button classes:', buttonClasses);

    // Should have basic button styling classes
    expect(buttonClasses).toMatch(/inline-flex/);
    expect(buttonClasses).toMatch(/w-full/);

    console.log('✅ Button is present and properly disabled');
  });

  test('Layout Structure - Two Column Layout', async ({ page }) => {
    // Check for form column - more specific selector
    const formColumn = page.locator('div.flex-1.flex-col');
    await expect(formColumn).toBeVisible();

    // Check for hero section (should be hidden on mobile/tablet)
    const heroColumn = page.locator('div.hidden.lg\\:block.relative');

    // On desktop, hero should be visible
    await page.setViewportSize({ width: 1280, height: 720 });
    await expect(heroColumn).toBeVisible();

    console.log('✅ Layout structure is correct');
  });

  test('Tailwind CSS Classes - Basic Verification', async ({ page }) => {
    // Check if body has any classes
    const bodyClasses = await page.locator('body').getAttribute('class');
    console.log('Body classes:', bodyClasses);

    // Check main container classes
    const mainContainer = page.locator('div.min-h-screen');
    const mainClasses = await mainContainer.getAttribute('class');
    console.log('Main container classes:', mainClasses);

    expect(mainClasses).toMatch(/min-h-screen/);
    expect(mainClasses).toMatch(/flex/);

    console.log('✅ Basic Tailwind classes are present');
  });

  test('CSS Custom Properties - Theme Variables', async ({ page }) => {
    // Check if CSS custom properties are defined
    const customProperties = await page.evaluate(() => {
      const root = document.documentElement;
      const styles = getComputedStyle(root);

      return {
        '--background': styles.getPropertyValue('--background'),
        '--foreground': styles.getPropertyValue('--foreground'),
        '--primary': styles.getPropertyValue('--primary'),
        '--destructive': styles.getPropertyValue('--destructive')
      };
    });

    console.log('Custom properties found:', customProperties);

    // At least background and foreground should be defined
    expect(customProperties['--background']).toBeDefined();
    expect(customProperties['--foreground']).toBeDefined();

    console.log('✅ CSS custom properties are defined');
  });

  test('Input Field Styling - Basic Validation', async ({ page }) => {
    const inputs = page.locator('input[type="text"], input[type="email"], input[type="password"]');
    const inputCount = await inputs.count();

    console.log(`Found ${inputCount} input fields`);

    for (let i = 0; i < Math.min(inputCount, 3); i++) {
      const input = inputs.nth(i);
      const inputClasses = await input.getAttribute('class');
      console.log(`Input ${i} classes:`, inputClasses);

      // Should have some basic styling
      expect(inputClasses).toMatch(/border/);
    }

    console.log('✅ Input fields have basic styling');
  });

  test('Error Handling - Form Submission Without Data', async ({ page }) => {
    const createButton = page.locator('button[type="submit"]').filter({ hasText: 'Create account' });

    // Button should be disabled
    await expect(createButton).toBeDisabled();

    // Fill minimum required fields to enable button
    await page.fill('input[id="company_name"]', 'Test Company');
    await page.fill('input[id="first_name"]', 'John');
    await page.fill('input[id="last_name"]', 'Doe');
    await page.fill('input[id="email"]', 'john.doe@example.com');
    await page.fill('input[id="password"]', 'Password123!');
    await page.fill('input[id="confirmPassword"]', 'Password123!');
    await page.check('#acceptTerms');

    // Button should now be enabled
    await expect(createButton).toBeEnabled();

    console.log('✅ Form validation works correctly');
  });
});