// このファイルは書き換えないでください
import { afterEach, beforeEach, expect, expectTypeOf, test, vi } from "vitest";
import { getText, API } from "../src/q03-03-get-text";
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

test("問3 getText", async () => {
  respondText("こんにちは");
  await expect(getText(`${API}/hello`)).resolves.toBe("こんにちは");
  expect(fetchMock).toHaveBeenCalledWith(`${API}/hello`);
  expectTypeOf(getText).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(getText).returns.toEqualTypeOf<Promise<string>>();
});
