// このファイルは書き換えないでください
import { afterEach, expect, expectTypeOf, test, vi } from "vitest";
import { sumOfAll } from "../src/q01-14-sum-of-all";
// ms ミリ秒後に value で解決する Promise
const later = <T>(value: T, ms: number) =>
  new Promise<T>((resolve) => {
    setTimeout(() => {
      resolve(value);
    }, ms);
  });
afterEach(() => {
  vi.useRealTimers();
});

test("問14 sumOfAll", async () => {
  await expect(sumOfAll([Promise.resolve(1), later(2, 5)])).resolves.toBe(3);
  await expect(sumOfAll([])).resolves.toBe(0);
  expectTypeOf(sumOfAll).returns.toEqualTypeOf<Promise<number>>();
});
