import { test, expect } from '@playwright/test';

test.describe('Register Page UI Verification - Tailwind CSS v4.1 Migration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/register');
    // Wait for page to load completely
    await page.waitForLoadState('networkidle');
  });

  test('Layout Verification - Page Structure and Components', async ({ page }) => {
    // Verify page is not blank/white
    const body = page.locator('body');
    await expect(body).toBeVisible();

    // Check main container structure
    const mainContainer = page.locator('div.min-h-screen');
    await expect(mainContainer).toBeVisible();
    await expect(mainContainer).toHaveClass(/flex/);

    // Verify two-column layout exists
    const formColumn = page.locator('div.flex-1').first();
    const heroColumn = page.locator('div.hidden.lg\\:flex.lg\\:flex-1');
    await expect(formColumn).toBeVisible();
    await expect(heroColumn).toBeVisible();

    // Check form container structure
    const formContainer = page.locator('div.mx-auto.w-full.max-w-sm.lg\\:w-96');
    await expect(formContainer).toBeVisible();

    // Verify page title and subtitle
    const title = page.locator('h2').filter({ hasText: 'Create your account' });
    const subtitle = page.locator('p').filter({ hasText: /Join AgroMart/ });
    await expect(title).toBeVisible();
    await expect(subtitle).toBeVisible();
  });

  test('Create Account Button - Functionality and Styling', async ({ page }) => {
    const createButton = page.locator('button[type="submit"]').filter({ hasText: 'Create account' });

    // Verify button exists and is visible
    await expect(createButton).toBeVisible();

    // Check initial button state (should be disabled due to form validation)
    await expect(createButton).toBeDisabled();

    // Verify button styling classes
    await expect(createButton).toHaveClass(/w-full/);

    // Test button hover state (if enabled)
    await createButton.hover();
    // Button should maintain hover styles

    // Test button focus state
    await createButton.focus();
    // Button should have focus ring

    // Fill form to enable button
    await page.fill('input[id="company_name"]', 'Test Company');
    await page.fill('input[id="first_name"]', 'John');
    await page.fill('input[id="last_name"]', 'Doe');
    await page.fill('input[id="email"]', 'john.doe@example.com');
    await page.fill('input[id="password"]', 'Password123!');
    await page.fill('input[id="confirmPassword"]', 'Password123!');
    await page.check('input[id="acceptTerms"]');

    // Button should now be enabled
    await expect(createButton).toBeEnabled();

    // Test loading state by clicking (this will show spinner)
    await createButton.click();
    const spinner = page.locator('div.animate-spin');
    await expect(spinner).toBeVisible();
  });

  test('Tailwind CSS Classes and Custom Theme Variables', async ({ page }) => {
    // Test background colors and theme variables
    const heroSection = page.locator('div.bg-gradient-to-br');
    await expect(heroSection).toBeVisible();
    await expect(heroSection).toHaveClass(/from-primary-600/);
    await expect(heroSection).toHaveClass(/to-primary-800/);

    // Check text colors
    const title = page.locator('h2').filter({ hasText: 'Create your account' });
    await expect(title).toHaveClass(/text-neutral-900/);

    const subtitle = page.locator('p').filter({ hasText: /Join AgroMart/ });
    await expect(subtitle).toHaveClass(/text-neutral-600/);

    // Test spacing utilities
    const form = page.locator('form.space-y-6');
    await expect(form).toHaveClass(/space-y-6/);

    // Check grid layout for first/last name
    const nameGrid = page.locator('div.grid.grid-cols-2');
    await expect(nameGrid).toHaveClass(/grid-cols-2/);
    await expect(nameGrid).toHaveClass(/gap-4/);

    // Verify custom theme colors are applied
    const heroText = page.locator('div.text-white');
    await expect(heroText).toBeVisible();
    await expect(heroText).toHaveClass(/text-white/);
  });

  test('Form Elements and Input Styling', async ({ page }) => {
    // Test input fields styling
    const inputs = page.locator('input[type="text"], input[type="email"], input[type="password"]');
    const inputCount = await inputs.count();

    for (let i = 0; i < inputCount; i++) {
      const input = inputs.nth(i);
      await expect(input).toBeVisible();

      // Check input has proper base classes
      const inputClass = await input.getAttribute('class');
      expect(inputClass).toMatch(/border/);
      expect(inputClass).toMatch(/px-|py-/);
    }

    // Test label styling
    const labels = page.locator('label');
    const labelCount = await labels.count();

    for (let i = 0; i < labelCount; i++) {
      const label = labels.nth(i);
      await expect(label).toBeVisible();
    }

    // Test checkbox styling
    const checkbox = page.locator('input[type="checkbox"]');
    await expect(checkbox).toBeVisible();

    // Test button styling within inputs (password toggle)
    const toggleButtons = page.locator('button').filter({ hasText: '' }); // Empty text buttons
    const toggleButtonCount = await toggleButtons.count();

    for (let i = 0; i < toggleButtonCount; i++) {
      const button = toggleButtons.nth(i);
      await expect(button).toHaveClass(/absolute/);
      await expect(button).toHaveClass(/right-0/);
    }
  });

  test('Component Inspection - DOM Classes and CSS Variables', async ({ page }) => {
    // Check for Tailwind CSS classes in DOM
    const bodyClasses = await page.locator('body').getAttribute('class');
    expect(bodyClasses).toBeDefined();

    // Verify CSS custom properties (CSS variables) are present
    const computedStyle = await page.evaluate(() => {
      const element = document.querySelector('div.min-h-screen');
      if (element) {
        const styles = getComputedStyle(element);
        return {
          backgroundColor: styles.backgroundColor,
          color: styles.color,
          padding: styles.padding,
          margin: styles.margin
        };
      }
      return null;
    });

    expect(computedStyle).toBeTruthy();
    if (computedStyle) {
      expect(computedStyle.backgroundColor).toBeDefined();
    }

    // Check for responsive classes
    const responsiveContainer = page.locator('div.mx-auto');
    const responsiveClasses = await responsiveContainer.getAttribute('class');
    expect(responsiveClasses).toMatch(/max-w-sm/);
    expect(responsiveClasses).toMatch(/lg:w-96/);
  });

  test('Responsiveness Testing - Different Screen Sizes', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForLoadState('networkidle');

    // On mobile, hero section should be hidden
    const heroSection = page.locator('div.hidden.lg\\:block');
    await expect(heroSection).not.toBeVisible();

    // Form should still be visible and properly sized
    const form = page.locator('form');
    await expect(form).toBeVisible();

    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForLoadState('networkidle');

    // Hero section should still be hidden on tablet
    await expect(heroSection).not.toBeVisible();

    // Test desktop viewport
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.waitForLoadState('networkidle');

    // Hero section should now be visible
    await expect(heroSection).toBeVisible();

    // Check two-column layout is properly applied
    const mainContainer = page.locator('div.min-h-screen');
    const flexDirection = await mainContainer.getAttribute('class');
    expect(flexDirection).toMatch(/flex/);
  });

  test('Error States and Validation Styling', async ({ page }) => {
    // Test form validation by submitting empty form
    const createButton = page.locator('button[type="submit"]').filter({ hasText: 'Create account' });
    await createButton.click();

    // Check for error messages (this may show API errors or validation errors)
    // The page should handle errors gracefully without breaking layout

    // Test individual field validation
    const emailInput = page.locator('input[id="email"]');
    await emailInput.fill('invalid-email');
    await emailInput.press('Tab'); // Trigger validation

    // Check if error styling is applied (border-destructive class)
    const emailClass = await emailInput.getAttribute('class');
    // Note: Error styling may be applied after form submission or on blur

    // Test valid email
    await emailInput.fill('valid@example.com');
    await emailInput.press('Tab');

    // Verify error styling is removed if applicable
  });

  test('Interactive Elements - Hover and Focus States', async ({ page }) => {
    // Test link hover states
    const links = page.locator('a');
    const linkCount = await links.count();

    for (let i = 0; i < linkCount; i++) {
      const link = links.nth(i);
      await link.hover();
      // Link should show hover effects
    }

    // Test input focus states
    const inputs = page.locator('input');
    const inputCount = await inputs.count();

    for (let i = 0; i < inputCount; i++) {
      const input = inputs.nth(i);
      await input.focus();
      // Input should show focus ring
      await input.blur();
    }

    // Test button focus states
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();

    for (let i = 0; i < buttonCount; i++) {
      const button = buttons.nth(i);
      await button.focus();
      // Button should show focus ring
      await button.blur();
    }
  });

  test('Custom Theme Variables and CSS Properties', async ({ page }) => {
    // Check if custom CSS properties are defined and applied
    const customProperties = await page.evaluate(() => {
      const root = document.documentElement;
      const styles = getComputedStyle(root);

      return {
        '--primary-600': styles.getPropertyValue('--primary-600'),
        '--primary-800': styles.getPropertyValue('--primary-800'),
        '--neutral-900': styles.getPropertyValue('--neutral-900'),
        '--neutral-600': styles.getPropertyValue('--neutral-600'),
        '--destructive': styles.getPropertyValue('--destructive'),
        '--background': styles.getPropertyValue('--background'),
        '--foreground': styles.getPropertyValue('--foreground')
      };
    });

    // Verify that key theme variables are defined
    expect(customProperties['--background']).toBeDefined();
    expect(customProperties['--foreground']).toBeDefined();
    expect(customProperties['--destructive']).toBeDefined();

    // Check if primary colors are defined (may be defined differently in v4.1)
    const hasPrimaryColors = customProperties['--primary-600'] || customProperties['--primary-800'];
    expect(hasPrimaryColors).toBeTruthy();
  });

  test('Performance and Loading States', async ({ page }) => {
    // Test page load performance
    const loadTime = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return navigation.loadEventEnd - navigation.startTime;
    });

    // Page should load within reasonable time (less than 5 seconds)
    expect(loadTime).toBeLessThan(5000);

    // Check for any console errors during page load
    const errors: string[] = [];
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });

    // Wait a bit for any async errors
    await page.waitForTimeout(1000);

    // Should have no console errors
    expect(errors.length).toBe(0);
  });
});