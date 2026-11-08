// このファイルは書き換えないでください
import { afterEach, beforeEach, expect, expectTypeOf, test, vi } from "vitest";
import { deleteTodo, API } from "../src/q03-16-delete-todo";
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

test("問16 deleteTodo", async () => {
  respond({});
  await expect(deleteTodo(3)).resolves.toBe(true);
  expect(fetchMock).toHaveBeenCalledWith(`${API}/todos/3`, { method: "DELETE" });
  respond({}, 404);
  await expect(deleteTodo(9)).resolves.toBe(false);
  expectTypeOf(deleteTodo).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(deleteTodo).returns.toEqualTypeOf<Promise<boolean>>();
});
