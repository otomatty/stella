// このファイルは書き換えないでください
import { afterEach, beforeEach, expect, expectTypeOf, test, vi } from "vitest";
import { getUser, API, type User } from "../src/q03-06-get-user";
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

test("問6 getUser", async () => {
  respond({ id: 1, name: "山田" });
  await expect(getUser(1)).resolves.toEqual({ id: 1, name: "山田" });
  expect(fetchMock).toHaveBeenCalledWith(`${API}/users/1`);
  respond({ id: 1 });
  await expect(getUser(1)).rejects.toThrow("ユーザーの形が違います");
  respond({}, 404);
  await expect(getUser(1)).rejects.toThrow("HTTP 404");
  expectTypeOf(getUser).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(getUser).returns.toEqualTypeOf<Promise<User>>();
});
