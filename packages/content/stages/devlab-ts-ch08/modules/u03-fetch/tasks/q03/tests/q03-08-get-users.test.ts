// このファイルは書き換えないでください
import { afterEach, beforeEach, expect, expectTypeOf, test, vi } from "vitest";
import { getUsers, API, type User } from "../src/q03-08-get-users";
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

test("問8 getUsers", async () => {
  respond([{ id: 1, name: "山田" }]);
  await expect(getUsers()).resolves.toEqual([{ id: 1, name: "山田" }]);
  expect(fetchMock).toHaveBeenCalledWith(`${API}/users`);
  respond({ id: 1, name: "山田" });
  await expect(getUsers()).rejects.toThrow("ユーザーの形が違います");
  respond([{ id: 1, name: "山田" }, { id: 2 }]);
  await expect(getUsers()).rejects.toThrow("ユーザーの形が違います");
  expectTypeOf(getUsers).returns.toEqualTypeOf<Promise<User[]>>();
});
