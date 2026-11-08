// このファイルは書き換えないでください
import { afterEach, beforeEach, expect, expectTypeOf, test, vi } from "vitest";
import { getTodoTitles, API } from "../src/q03-09-get-todo-titles";
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

test("問9 getTodoTitles", async () => {
  respond([
    { id: 1, title: "買い物", done: false },
    { id: 2, title: "掃除", done: true },
  ]);
  await expect(getTodoTitles()).resolves.toEqual(["買い物", "掃除"]);
  expect(fetchMock).toHaveBeenCalledWith(`${API}/todos`);
  respond([{ id: 1, title: "買い物" }]);
  await expect(getTodoTitles()).rejects.toThrow("TODO の形が違います");
  expectTypeOf(getTodoTitles).returns.toEqualTypeOf<Promise<string[]>>();
});
