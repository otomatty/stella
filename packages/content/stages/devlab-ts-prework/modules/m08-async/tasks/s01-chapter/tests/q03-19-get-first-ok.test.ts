// このファイルは書き換えないでください
import { afterEach, beforeEach, expect, expectTypeOf, test, vi } from "vitest";
import { getFirstOk, API } from "../src/q03-19-get-first-ok";
// 本物の通信をしないように、fetch を差し替える
const fetchMock = vi.fn<typeof fetch>();

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

test("問19 getFirstOk", async () => {
  respondText("", 404);
  respondText("b");
  await expect(getFirstOk([`${API}/a`, `${API}/b`, `${API}/c`])).resolves.toBe("b");
  expect(fetchMock).toHaveBeenCalledTimes(2);
  respondText("", 500);
  await expect(getFirstOk([`${API}/a`])).rejects.toThrow("取得できませんでした");
  expectTypeOf(getFirstOk).returns.toEqualTypeOf<Promise<string>>();
});
