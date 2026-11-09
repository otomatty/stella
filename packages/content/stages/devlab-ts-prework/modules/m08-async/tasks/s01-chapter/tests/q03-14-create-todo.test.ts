// このファイルは書き換えないでください
import { afterEach, beforeEach, expect, expectTypeOf, test, vi } from "vitest";
import { createTodo, API, type Todo } from "../src/q03-14-create-todo";
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

test("問14 createTodo", async () => {
  respond({ id: 5, title: "買い物", done: false }, 201);
  await expect(createTodo("買い物")).resolves.toEqual({ id: 5, title: "買い物", done: false });
  expect(fetchMock).toHaveBeenCalledWith(`${API}/todos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: '{"title":"買い物","done":false}',
  });
  respond({ message: "title が空です" }, 400);
  await expect(createTodo("")).rejects.toThrow("HTTP 400");
  respond({ id: 5 }, 201);
  await expect(createTodo("a")).rejects.toThrow("TODO の形が違います");
  expectTypeOf(createTodo).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(createTodo).returns.toEqualTypeOf<Promise<Todo>>();
});
