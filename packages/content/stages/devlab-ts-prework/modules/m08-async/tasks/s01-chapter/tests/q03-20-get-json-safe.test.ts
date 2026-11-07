// このファイルは書き換えないでください
import { afterEach, beforeEach, expect, expectTypeOf, test, vi } from "vitest";
import { getJsonSafe, API } from "../src/q03-20-get-json-safe";
// 本物の通信をしないように、fetch を差し替える
const fetchMock = vi.fn<typeof fetch>();

const respond = (body: unknown, status = 200) => {
  fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(body), { status }));
};

const respondText = (text: string, status = 200) => {
  fetchMock.mockResolvedValueOnce(new Response(text, { status }));
};
beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

test("問20 getJsonSafe", async () => {
  respond({ a: 1 });
  await expect(getJsonSafe(`${API}/a`)).resolves.toEqual({ a: 1 });
  fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
  await expect(getJsonSafe(`${API}/a`)).resolves.toBeUndefined();
  respond({}, 500);
  await expect(getJsonSafe(`${API}/a`)).resolves.toBeUndefined();
  respondText("JSON ではない");
  await expect(getJsonSafe(`${API}/a`)).resolves.toBeUndefined();
  expectTypeOf(getJsonSafe).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(getJsonSafe).returns.toEqualTypeOf<Promise<unknown>>();
});
