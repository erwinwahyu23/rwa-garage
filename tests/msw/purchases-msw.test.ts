import { beforeAll, afterAll, it, describe, expect } from 'vitest';
import http from 'node:http';

let serverHandle: { srv: any; port: number } | null = null;

beforeAll(async () => {
  serverHandle = await new Promise((resolve) => {
    const srv = http.createServer(async (req, res) => {
      if (req.method !== 'POST' || req.url !== '/api/inventory/purchases') {
        res.statusCode = 404;
        res.end();
        return;
      }
      let body = '';
      for await (const chunk of req) body += chunk;
      let parsed = null;
      try {
        parsed = JSON.parse(body || '{}');
      } catch (e) {
        parsed = null;
      }
      res.setHeader('Content-Type', 'application/json');
      if (!parsed || !parsed.quantity || !parsed.costPrice) {
        res.statusCode = 422;
        res.end(JSON.stringify({ error: 'Validation failed' }));
        return;
      }
      if (parsed.sparePartId === 'missing') {
        res.statusCode = 404;
        res.end(JSON.stringify({ error: 'not found' }));
        return;
      }
      res.statusCode = 201;
      res.end(JSON.stringify({ id: 'local-purchase', ...parsed }));
    });
    srv.listen(0, '127.0.0.1', () => {
      // @ts-ignore
      const addr = srv.address();
      const port = typeof addr === 'string' ? parseInt(addr.split(':').pop() || '0', 10) : (addr?.port ?? 0);
      resolve({ srv, port });
    });
  });
});

afterAll(() => {
  if (serverHandle) serverHandle.srv.close();
});

describe('Local purchases API', () => {
  it('returns 201 when payload valid', async () => {
    const url = `http://127.0.0.1:${serverHandle!.port}/api/inventory/purchases`;
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sparePartId: 's1', quantity: 2, costPrice: 100 }) });
    expect(res.status).toBe(201);
    const j = await res.json();
    expect(j.id).toBe('local-purchase');
  });

  it('returns 422 on validation error', async () => {
    const url = `http://127.0.0.1:${serverHandle!.port}/api/inventory/purchases`;
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
    expect(res.status).toBe(422);
  });

  it('returns 404 when service reports not found', async () => {
    const url = `http://127.0.0.1:${serverHandle!.port}/api/inventory/purchases`;
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sparePartId: 'missing', quantity: 1, costPrice: 50 }) });
    expect(res.status).toBe(404);
  });
});
