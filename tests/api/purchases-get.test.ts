import { describe, it, expect, vi, beforeEach } from "vitest";

const listPurchasesMock = vi.fn();
vi.mock("../../src/lib/inventory/service", () => ({ listPurchases: listPurchasesMock }));

const route = await import("../../src/app/api/inventory/purchases/route");

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/inventory/purchases', () => {
  it('forwards supplierId to service and returns payload', async () => {
    const mocked = { total: 2, items: [ { id: 'p1' }, { id: 'p2' } ] };
    listPurchasesMock.mockResolvedValueOnce(mocked);

    const req = { url: 'http://localhost/api/inventory/purchases?supplierId=s1' } as unknown as Request;
    const res = await route.GET(req);

    expect(listPurchasesMock).toHaveBeenCalled();
    const calledWith = listPurchasesMock.mock.calls[0][0];
    expect(calledWith).toMatchObject({ supplierId: 's1' });

    expect((res as Response).status).toBe(200);
    const j = await (res as Response).json();
    expect(j).toEqual(mocked);
  });

  it('forwards sparePartId to service and returns payload', async () => {
    const mocked = { total: 1, items: [ { id: 'p3' } ] };
    listPurchasesMock.mockResolvedValueOnce(mocked);

    const req = { url: 'http://localhost/api/inventory/purchases?sparePartId=sp1' } as unknown as Request;
    const res = await route.GET(req);

    expect(listPurchasesMock).toHaveBeenCalled();
    const calledWith = listPurchasesMock.mock.calls[0][0];
    expect(calledWith).toMatchObject({ sparePartId: 'sp1' });

    expect((res as Response).status).toBe(200);
    const j = await (res as Response).json();
    expect(j).toEqual(mocked);
  });
});
