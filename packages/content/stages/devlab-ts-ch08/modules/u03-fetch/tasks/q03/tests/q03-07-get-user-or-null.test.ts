// このファイルは書き換えないでください
import { afterEach, beforeEach, expect, expectTypeOf, test, vi } from "vitest";
import { getUserOrNull, API, type User } from "../src/q03-07-get-user-or-null";
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

test("問7 getUserOrNull", async () => {
  respond({}, 404);
  await expect(getUserOrNull(9)).resolves.toBeNull();
  expect(fetchMock).toHaveBeenCalledWith(`${API}/users/9`);
  respond({ id: 2, name: "佐藤" });
  await expect(getUserOrNull(2)).resolves.toEqual({ id: 2, name: "佐藤" });
  respond({}, 500);
  await expect(getUserOrNull(2)).rejects.toThrow("HTTP 500");
  expectTypeOf(getUserOrNull).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(getUserOrNull).returns.toEqualTypeOf<Promise<User | null>>();
});
