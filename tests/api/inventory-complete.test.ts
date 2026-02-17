import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the service and ensure the route forwards the `complete` flag.
const getSparePartsMock = vi.fn();
vi.mock("../../src/lib/inventory/service", () => ({ getSpareParts: getSparePartsMock }));

const route = await import("../../src/app/api/inventory/route");
const svc = await import("../../src/lib/inventory/service");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/inventory?complete=1", () => {
  it("forwards complete=1 to the service and returns the service payload", async () => {
    const mocked = { total: 2, items: [{ id: "s1", stock: 1 }, { id: "s2", stock: 5 }] };
    getSparePartsMock.mockResolvedValueOnce(mocked);

    const req = { url: "http://localhost/api/inventory?complete=1" } as unknown as Request;
    const res = await route.GET(req);

    expect(getSparePartsMock).toHaveBeenCalled();
    const calledWith = getSparePartsMock.mock.calls[0][0];
    expect(calledWith).toMatchObject({ complete: true });

    expect((res as Response).status).toBe(200);
    const j = await (res as Response).json();
    expect(j).toEqual(mocked);
  });
});
