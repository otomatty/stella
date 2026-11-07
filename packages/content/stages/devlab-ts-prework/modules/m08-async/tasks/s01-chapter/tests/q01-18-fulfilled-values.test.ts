// このファイルは書き換えないでください
import { afterEach, expect, expectTypeOf, test, vi } from "vitest";
import { fulfilledValues } from "../src/q01-18-fulfilled-values";
afterEach(() => {
  vi.useRealTimers();
});

test("問18 fulfilledValues", async () => {
  await expect(
    fulfilledValues([Promise.resolve(1), Promise.reject(new Error("x")), Promise.resolve(3)]),
  ).resolves.toEqual([1, 3]);
  expectTypeOf(fulfilledValues).returns.toEqualTypeOf<Promise<number[]>>();
});
