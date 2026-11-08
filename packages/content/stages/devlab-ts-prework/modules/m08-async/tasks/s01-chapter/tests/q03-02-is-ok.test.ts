// このファイルは書き換えないでください
import { afterEach, beforeEach, expect, expectTypeOf, test, vi } from "vitest";
import { isOk, API } from "../src/q03-02-is-ok";
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

test("問2 isOk", async () => {
  respond({});
  await expect(isOk(`${API}/a`)).resolves.toBe(true);
  respond({}, 500);
  await expect(isOk(`${API}/a`)).resolves.toBe(false);
  expectTypeOf(isOk).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(isOk).returns.toEqualTypeOf<Promise<boolean>>();
});
