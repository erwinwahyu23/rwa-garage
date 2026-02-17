import { describe, it, expect, vi, beforeEach } from "vitest";

// mock prisma used by service
vi.mock("../../src/lib/db/prisma", () => {
  return {
    prisma: {
      sparePart: {
        findUnique: vi.fn(),
        create: vi.fn(),
        upsert: vi.fn(),
        updateMany: vi.fn(),
        findMany: vi.fn(),
      },
      sellPrice: {
        createMany: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
      },
      auditLog: { create: vi.fn() },
      inventoryAudit: { create: vi.fn() },
      $transaction: vi.fn((cb: any) => cb({ sparePart: prismaMock.sparePart, sellPrice: prismaMock.sellPrice, inventoryAudit: prismaMock.inventoryAudit, auditLog: prismaMock.auditLog })),

    },
  };
});

const service = await import("../../src/lib/inventory/service");
const { createSparePart } = service;

type MockFn = ReturnType<typeof vi.fn>;

type MockPrisma = {
  sparePart: {
    findUnique: MockFn;
    create: MockFn;
    upsert: MockFn;
    updateMany: MockFn;
    findMany: MockFn;
    update?: MockFn;
  };
  sellPrice: {
    createMany: MockFn;
    findMany: MockFn;
    create: MockFn;
  };
  auditLog: { create: MockFn };
  inventoryAudit: { create: MockFn };
  $transaction: MockFn;
};

const { prisma } = await import("../../src/lib/db/prisma");
const prismaMock = prisma as unknown as MockPrisma;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("inventory service", () => {
  it("should throw when creating duplicate code", async () => {
    prismaMock.sparePart.findUnique.mockResolvedValue({ id: "exists" });
    await expect(createSparePart({ code: "X", name: "x", category: "c", costPrice: 1000 })).rejects.toThrow(
      /already exists/
    );
  });


});
