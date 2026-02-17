import { describe, it, expect, vi, beforeEach } from "vitest";

// mock requireAdmin to be a no-op and mock service
vi.mock("../../src/lib/auth", () => ({
  requireAdmin: vi.fn(() => Promise.resolve()),
}));

const createPurchaseMock = vi.fn();
vi.mock("../../src/lib/inventory/service", () => ({
  createPurchase: createPurchaseMock,
}));

const route = await import("../../src/app/api/inventory/purchases/route");
const { requireAdmin } = await import("../../src/lib/auth");
const svc = await import("../../src/lib/inventory/service");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/inventory/purchases", () => {
  it("returns 201 and created purchase on success", async () => {
    createPurchaseMock.mockResolvedValueOnce({ id: "p-ok" });

    const req = { json: async () => ({ sparePartId: "s1", quantity: 2, costPrice: 100 }) } as unknown as Request;
    const res = await route.POST(req);

    expect(requireAdmin).toHaveBeenCalled();
    expect(createPurchaseMock).toHaveBeenCalled();
    expect(res.status).toBe(201);
    expect(await (res as Response).json()).toEqual(expect.objectContaining({ id: "p-ok" }));
  });

  it("returns 422 when payload fails validation", async () => {
    const req = { json: async () => ({}) } as unknown as Request;
    const res = await route.POST(req);

    expect(res.status).toBe(422);
    const j = await (res as Response).json();
    expect(j.error).toBe("Validation failed");
  });

  it("maps service not found error to 404", async () => {
    createPurchaseMock.mockImplementationOnce(() => { throw new Error('not found'); });
    const req = { json: async () => ({ sparePartId: "missing", quantity: 1, costPrice: 100 }) } as unknown as Request;
    const res = await route.POST(req);

    expect(res.status).toBe(404);
    const j = await (res as Response).json();
    expect(j.error).toContain('not found');
  });
});