// このファイルは書き換えないでください
import { afterEach, beforeEach, expect, expectTypeOf, test, vi } from "vitest";
import { getJson, API } from "../src/q03-04-get-json";
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

test("問4 getJson", async () => {
  respond({ a: 1 });
  await expect(getJson(`${API}/a`)).resolves.toEqual({ a: 1 });
  expectTypeOf(getJson).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(getJson).returns.toEqualTypeOf<Promise<unknown>>();
});
