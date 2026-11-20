// このファイルは書き換えないでください
import { afterEach, expect, expectTypeOf, test, vi } from "vitest";
import { chainSteps } from "../src/q01-20-chain-steps";
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

test("問20 chainSteps", async () => {
  const addOne = (n: number) => Promise.resolve(n + 1);
  const times2 = (n: number) => later(n * 2, 5);
  await expect(chainSteps(1, [addOne, times2])).resolves.toBe(4);
  await expect(chainSteps(1, [times2, addOne])).resolves.toBe(3);
  await expect(chainSteps(7, [])).resolves.toBe(7);
  expectTypeOf(chainSteps).returns.toEqualTypeOf<Promise<number>>();
});
