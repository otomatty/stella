// このファイルは書き換えないでください
import { afterEach, beforeEach, expect, expectTypeOf, test, vi } from "vitest";
import { postJson, API } from "../src/q03-13-post-json";
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

test("問13 postJson", async () => {
  respond({}, 201);
  await expect(postJson(`${API}/logs`, { level: "info" })).resolves.toBe(201);
  expect(fetchMock).toHaveBeenCalledWith(`${API}/logs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: '{"level":"info"}',
  });
  expectTypeOf(postJson).parameters.toEqualTypeOf<[string, unknown]>();
  expectTypeOf(postJson).returns.toEqualTypeOf<Promise<number>>();
});
