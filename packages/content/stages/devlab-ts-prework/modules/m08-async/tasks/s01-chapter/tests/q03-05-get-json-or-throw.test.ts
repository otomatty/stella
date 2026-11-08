// このファイルは書き換えないでください
import { afterEach, beforeEach, expect, expectTypeOf, test, vi } from "vitest";
import { getJsonOrThrow, API } from "../src/q03-05-get-json-or-throw";
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

test("問5 getJsonOrThrow", async () => {
  respond({ a: 1 });
  await expect(getJsonOrThrow(`${API}/a`)).resolves.toEqual({ a: 1 });
  respond({}, 404);
  await expect(getJsonOrThrow(`${API}/a`)).rejects.toThrow("HTTP 404");
  expectTypeOf(getJsonOrThrow).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(getJsonOrThrow).returns.toEqualTypeOf<Promise<unknown>>();
});
