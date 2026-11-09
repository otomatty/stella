// このファイルは書き換えないでください
import { afterEach, beforeEach, expect, expectTypeOf, test, vi } from "vitest";
import { updateTodo, API } from "../src/q03-15-update-todo";
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

test("問15 updateTodo", async () => {
  respond({});
  await expect(updateTodo(3, true)).resolves.toBe(true);
  expect(fetchMock).toHaveBeenCalledWith(`${API}/todos/3`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: '{"done":true}',
  });
  expectTypeOf(updateTodo).parameters.toEqualTypeOf<[number, boolean]>();
  expectTypeOf(updateTodo).returns.toEqualTypeOf<Promise<boolean>>();
});
