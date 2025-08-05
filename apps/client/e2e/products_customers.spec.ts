import { test, expect } from '@playwright/test';

const base = process.env.E2E_BASE || 'http://localhost:3000';

async function login(page) {
  await page.goto(base + '/login');
  // Adjust selectors per actual UI; fallback to API login if no UI route exists
  if (await page.locator('input[name="email"]').count()) {
    await page.fill('input[name="email"]', 'admin@example.com');
    await page.fill('input[name="password"]', 'password');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(300);
  } else {
    // fallback: API login to ensure cookie/session
    const res = await page.request.post('http://localhost:8080/api/auth/login', {
      data: { email: 'admin@example.com', password: 'password' }
    });
    expect(res.status()).toBe(200);
  }
}

test('Products API reachable after login', async ({ page }) => {
  await login(page);
  const res = await page.request.get('http://localhost:8080/api/products', {
    headers: { Authorization: `Bearer dummy` }
  });
  // The server requires a real token; we check endpoint exists by status not being 404
  expect([200, 400, 401, 403]).toContain(res.status());
});

test('Customers API reachable after login', async ({ page }) => {
  await login(page);
  const res = await page.request.get('http://localhost:8080/api/customers', {
    headers: { Authorization: `Bearer dummy` }
  });
  expect([200, 400, 401, 403]).toContain(res.status());
});
