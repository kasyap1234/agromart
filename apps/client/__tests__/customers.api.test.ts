import 'whatwg-fetch';

describe('Customers API proxy contract', () => {
  const base = 'http://localhost:9001';
  it('GET /api/customers should be reachable', async () => {
    const res = await fetch(base + '/api/customers');
    expect([200, 401, 400, 403]).toContain(res.status);
    const ct = res.headers.get('content-type') || '';
    expect(ct).toMatch(/application\/json/i);
  });
});
