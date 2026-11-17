// このファイルは書き換えないでください
import { afterEach, expect, expectTypeOf, test, vi } from "vitest";
import { assertOk, type ApiResult } from "../src/q04-14-assert-ok";
afterEach(() => {
  vi.useRealTimers();
});

test("問14 assertOk", async () => {
  await expect(assertOk(() => Promise.resolve({ ok: true, status: 200 }))).resolves.toBe(200);
  await expect(assertOk(() => Promise.resolve({ ok: false, status: 500 }))).rejects.toThrow(
    "HTTP 500",
  );
  expectTypeOf(assertOk).parameters.toEqualTypeOf<[() => Promise<ApiResult>]>();
  expectTypeOf(assertOk).returns.toEqualTypeOf<Promise<number>>();
});
