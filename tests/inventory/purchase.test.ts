import { describe, it, expect, vi, beforeEach } from "vitest";

// mock prisma used by service
vi.mock("../../src/lib/db/prisma", () => {
  // we'll populate mock functions below and expose them
  const fn = vi.fn;
  const sparePart = {
    findUnique: fn(),
    create: fn(),
    update: fn(),
  };
  const purchase = {
    create: fn(),
  };
  const inventoryAudit = {
    create: fn(),
  };
  const category = {
    findUnique: fn(),
  };

  return {
    prisma: {
      sparePart,
      purchase,
      inventoryAudit,
      category,
      $transaction: fn((cb: any) => cb({ sparePart, purchase, inventoryAudit, category })),
    },
  };
});

const service = await import("../../src/lib/inventory/service");
const { createPurchase } = service;

const { prisma } = await import("../../src/lib/db/prisma");
// typed mock helpers
type MockFn = ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createPurchase", () => {
  it("creates a purchase and updates stock when sparePart exists", async () => {
    // arrange: spare part exists with stock 5
    // ensure both calls inside transaction return the spare part
    (prisma.sparePart.findUnique as MockFn).mockResolvedValue({ id: "s1", stock: 5, isDeleted: false, version: 1 });
    (prisma.purchase.create as MockFn).mockResolvedValueOnce({ id: "p1" });

    // act
    const res = await createPurchase({ sparePartId: "s1", quantity: 3, costPrice: 10000 });

    // assert
    expect(prisma.purchase.create).toHaveBeenCalled();
    expect(prisma.sparePart.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "s1" }, data: expect.objectContaining({ stock: 8 }) }));
    // ensure costPrice is updated on purchase
    const updateCallArg = (prisma.sparePart.update as MockFn).mock.calls[0][0];
    expect(updateCallArg.data.costPrice).toBeDefined();
    expect(prisma.inventoryAudit.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ sparePartId: "s1", delta: 3, referenceId: "p1" }) }));
    expect(res).toEqual(expect.objectContaining({ id: "p1" }));
  });


});