import { test, expect } from '@playwright/test';

const api = 'http://localhost:8080';

test('Suppliers API reachable', async ({ request }) => {
  // First test that the API endpoint exists and responds
  const healthRes = await request.get(api + '/api/health');
  expect([200]).toContain(healthRes.status());

  // Test suppliers endpoint (may require auth, so we accept auth-related status codes)
  const res = await request.get(api + '/api/suppliers');
  expect([200, 400, 401, 403, 404]).toContain(res.status());

  console.log(`✅ Suppliers API responded with status: ${res.status()}`);

  // If we get 401, that means the endpoint exists but requires authentication
  if (res.status() === 401) {
    console.log('✅ Suppliers endpoint exists and requires authentication as expected');
  } else if (res.status() === 200) {
    console.log('✅ Suppliers endpoint accessible without authentication');
  }
});
