import 'whatwg-fetch';

describe('Products API proxy contract', () => {
  const base = 'http://localhost:9001';
  it('GET /api/products should be protected and/or return JSON', async () => {
    const res = await fetch(base + '/api/products');
    // can be 200 with auth or 401 without; ensure endpoint exists
    expect([200, 401, 400, 403]).toContain(res.status);
    const ct = res.headers.get('content-type') || '';
    expect(ct).toMatch(/application\/json/i);
  });
});
