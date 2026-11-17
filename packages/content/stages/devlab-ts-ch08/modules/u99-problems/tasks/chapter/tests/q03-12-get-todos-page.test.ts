// このファイルは書き換えないでください
import { afterEach, beforeEach, expect, expectTypeOf, test, vi } from "vitest";
import { getTodosPage, API, type Todo } from "../src/q03-12-get-todos-page";
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

test("問12 getTodosPage", async () => {
  respond([{ id: 11, title: "a", done: false }]);
  await expect(getTodosPage(2, 10)).resolves.toEqual([{ id: 11, title: "a", done: false }]);
  expect(fetchMock).toHaveBeenCalledWith(`${API}/todos?page=2&per_page=10`);
  expectTypeOf(getTodosPage).parameters.toEqualTypeOf<[number, number]>();
  expectTypeOf(getTodosPage).returns.toEqualTypeOf<Promise<Todo[]>>();
});
