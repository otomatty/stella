// このファイルは書き換えないでください
import { afterEach, beforeEach, expect, expectTypeOf, test, vi } from "vitest";
import { searchUsers, API, type User } from "../src/q03-11-search-users";
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

test("問11 searchUsers", async () => {
  respond([{ id: 1, name: "山田" }]);
  await expect(searchUsers("山田 太郎")).resolves.toEqual([{ id: 1, name: "山田" }]);
  expect(fetchMock).toHaveBeenCalledWith(`${API}/users?q=%E5%B1%B1%E7%94%B0%20%E5%A4%AA%E9%83%8E`);
  expectTypeOf(searchUsers).returns.toEqualTypeOf<Promise<User[]>>();
});
