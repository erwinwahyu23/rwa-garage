import { describe, it, expect, vi, beforeEach } from "vitest";

// mock requireAdmin to be a no-op and mock service
vi.mock("../../src/lib/auth", () => ({
  requireAdmin: vi.fn(() => Promise.resolve()),
}));

const createPurchasesMock = vi.fn();
vi.mock("../../src/lib/inventory/service", () => ({
  createPurchases: createPurchasesMock,
}));

const route = await import("../../src/app/api/inventory/purchases/route");
const { requireAdmin } = await import("../../src/lib/auth");
const svc = await import("../../src/lib/inventory/service");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/inventory/purchases (batch)", () => {
  it("creates multiple purchases and returns 201 with count", async () => {
    createPurchasesMock.mockResolvedValueOnce([{ id: 'p1' }, { id: 'p2' }]);

    const req = { json: async () => ({ supplierId: 's1', supplierRefNumber: 'REF123', purchaseDate: '2025-01-01', items: [{ sparePartId: 'a', quantity: 1, costPrice: 100 }] }) } as unknown as Request;
    const res = await route.POST(req);

    expect(requireAdmin).toHaveBeenCalled();
    expect(createPurchasesMock).toHaveBeenCalled();
    expect(res.status).toBe(201);
    const j = await (res as Response).json();
    expect(j.count).toBe(2);
    expect(Array.isArray(j.items)).toBe(true);
  });

  it("returns 422 when batch payload invalid", async () => {
    const req = { json: async () => ({ supplierId: '', supplierRefNumber: '', purchaseDate: '', items: [] }) } as unknown as Request;
    const res = await route.POST(req);
    expect(res.status).toBe(422);
    const j = await (res as Response).json();
    expect(j.error).toBe('Validation failed');
  });
});