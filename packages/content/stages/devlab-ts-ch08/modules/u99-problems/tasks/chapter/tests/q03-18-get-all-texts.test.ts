// このファイルは書き換えないでください
import { afterEach, beforeEach, expect, expectTypeOf, test, vi } from "vitest";
import { getAllTexts, API } from "../src/q03-18-get-all-texts";
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

test("問18 getAllTexts", async () => {
  respondText("a");
  respondText("b");
  await expect(getAllTexts([`${API}/a`, `${API}/b`])).resolves.toEqual(["a", "b"]);
  expect(fetchMock.mock.calls.map((call) => call[0])).toEqual([`${API}/a`, `${API}/b`]);
  expectTypeOf(getAllTexts).returns.toEqualTypeOf<Promise<string[]>>();
});
