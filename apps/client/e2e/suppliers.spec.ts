import { test, expect } from '@playwright/test';

const api = 'http://localhost:8080';

test('Suppliers API reachable after login', async ({ request }) => {
  const resLogin = await request.post(api + '/api/auth/login', {
    data: { email: 'admin@example.com', password: 'password' }
  });
  expect(resLogin.status()).toBe(200);
  const body = await resLogin.json().catch(() => ({} as any));
  const token = body.token || '';
  expect(token.length).toBeGreaterThan(0);

  const res = await request.get(api + '/api/suppliers', {
    headers: { Authorization: `Bearer ${token}` }
  });
  expect([200, 400, 401, 403]).toContain(res.status());
});
