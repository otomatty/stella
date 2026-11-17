// このファイルは書き換えないでください
import { afterEach, beforeEach, expect, expectTypeOf, test, vi } from "vitest";
import { countDone } from "../src/q03-10-count-done";
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

test("問10 countDone", async () => {
  respond([
    { id: 1, title: "買い物", done: false },
    { id: 2, title: "掃除", done: true },
  ]);
  await expect(countDone()).resolves.toBe(1);
  respond("todos");
  await expect(countDone()).rejects.toThrow("TODO の形が違います");
  expectTypeOf(countDone).returns.toEqualTypeOf<Promise<number>>();
});
