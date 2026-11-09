// このファイルは書き換えないでください
import { afterEach, expect, expectTypeOf, test, vi } from "vitest";
import { settledCount } from "../src/q01-17-settled-count";
afterEach(() => {
  vi.useRealTimers();
});

test("問17 settledCount", async () => {
  await expect(
    settledCount([Promise.resolve(1), Promise.reject(new Error("x")), Promise.resolve(3)]),
  ).resolves.toBe(2);
  expectTypeOf(settledCount).returns.toEqualTypeOf<Promise<number>>();
});
