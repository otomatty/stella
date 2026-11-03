import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LibraryShelfEntry } from "@stella/shared/library/types";

const apiFetch = vi.fn();
vi.mock("./api-client", () => ({
  apiFetch: (...args: unknown[]) => apiFetch(...args),
  apiFetchRaw: vi.fn(),
  ApiClientError: class extends Error {},
}));

const { getShelf } = await import("./library-api");

const entry = (id: number) => ({ book: { id: `b${id}` } }) as unknown as LibraryShelfEntry;
const page = (from: number, count: number, total: number) => ({
  entries: Array.from({ length: count }, (_, i) => entry(from + i)),
  total,
  limit: 200,
  offset: from,
});

beforeEach(() => apiFetch.mockReset());

describe("getShelf", () => {
  it("keeps fetching pages until every book on the shelf is loaded", async () => {
    apiFetch
      .mockResolvedValueOnce(page(0, 200, 450))
      .mockResolvedValueOnce(page(200, 200, 450))
      .mockResolvedValueOnce(page(400, 50, 450));
    const shelf = await getShelf("all");
    expect(shelf.entries).toHaveLength(450);
    expect(shelf.total).toBe(450);
    expect(apiFetch.mock.calls.map((call) => call[0])).toEqual([
      "/api/library/mine?filter=all&limit=200&offset=0",
      "/api/library/mine?filter=all&limit=200&offset=200",
      "/api/library/mine?filter=all&limit=200&offset=400",
    ]);
  });

  it("asks once when everything fits in one page", async () => {
    apiFetch.mockResolvedValueOnce(page(0, 3, 3));
    expect((await getShelf("favorite")).entries).toHaveLength(3);
    expect(apiFetch).toHaveBeenCalledTimes(1);
  });
});
