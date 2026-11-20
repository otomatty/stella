// このファイルは書き換えないでください
import { afterEach, beforeEach, expect, expectTypeOf, test, vi } from "vitest";
import { getWithToken, API } from "../src/q03-17-get-with-token";
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

test("問17 getWithToken", async () => {
  respondText("ひみつ");
  await expect(getWithToken(`${API}/me`, "abc")).resolves.toBe("ひみつ");
  expect(fetchMock).toHaveBeenCalledWith(`${API}/me`, { headers: { Authorization: "Bearer abc" } });
  expectTypeOf(getWithToken).parameters.toEqualTypeOf<[string, string]>();
  expectTypeOf(getWithToken).returns.toEqualTypeOf<Promise<string>>();
});
