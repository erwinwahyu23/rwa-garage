import { describe, it, expect, vi, beforeEach } from "vitest";

const listAllMock = vi.fn();
vi.mock("../../src/lib/inventory/service", () => ({ listAllSpareParts: listAllMock }));

const route = await import("../../src/app/api/inventory/all/route");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/inventory/all", () => {
  it("forwards q, page and pageSize to the service and returns payload", async () => {
    const mocked = { total: 3, items: [{ id: "a" }, { id: "b" }] };
    listAllMock.mockResolvedValueOnce(mocked);

    const req = { url: "http://localhost/api/inventory/all?q=bolt&page=2&pageSize=50" } as unknown as Request;
    const res = await route.GET(req);

    expect(listAllMock).toHaveBeenCalled();
    const calledWith = listAllMock.mock.calls[0][0];
    expect(calledWith).toMatchObject({ q: "bolt", page: 2, pageSize: 50 });

    expect((res as Response).status).toBe(200);
    const j = await (res as Response).json();
    expect(j).toEqual(mocked);
  });
});
