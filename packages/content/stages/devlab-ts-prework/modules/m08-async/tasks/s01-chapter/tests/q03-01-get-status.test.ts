// このファイルは書き換えないでください
import { afterEach, beforeEach, expect, expectTypeOf, test, vi } from "vitest";
import { getStatus, API } from "../src/q03-01-get-status";
// 本物の通信をしないように、fetch を差し替える
const fetchMock = vi.fn<typeof fetch>();

const respond = (body: unknown, status = 200) => {
  fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(body), { status }));
};
beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

test("問1 getStatus", async () => {
  respond({}, 404);
  await expect(getStatus(`${API}/a`)).resolves.toBe(404);
  expect(fetchMock).toHaveBeenCalledWith(`${API}/a`);
  expectTypeOf(getStatus).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(getStatus).returns.toEqualTypeOf<Promise<number>>();
});
