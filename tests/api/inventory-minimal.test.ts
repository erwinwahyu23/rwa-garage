import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/lib/auth', () => ({ requireAdmin: vi.fn(() => Promise.resolve()) }));
const route = await import('../../src/app/api/inventory/minimal/route');
const svc = await import('../../src/lib/inventory/service');

beforeEach(() => { vi.clearAllMocks(); });

describe('POST /api/inventory/minimal', () => {
  it('creates a minimal spare part and returns 201', async () => {
    const spy = vi.spyOn(svc, 'createSparePart').mockResolvedValueOnce({ id: 'sp1', code: 'C1', name: 'N1' } as any);
    const req = { json: async () => ({ code: 'C1', name: 'N1' }) } as unknown as Request;
    const res = await route.POST(req);
    expect(spy).toHaveBeenCalled();
    expect(res.status).toBe(201);
    const j = await (res as Response).json();
    expect(j.id).toBe('sp1');
  });

  it('returns 422 on bad payload', async () => {
    const req = { json: async () => ({ code: '', name: '' }) } as unknown as Request;
    const res = await route.POST(req);
    expect(res.status).toBe(422);
  });
});