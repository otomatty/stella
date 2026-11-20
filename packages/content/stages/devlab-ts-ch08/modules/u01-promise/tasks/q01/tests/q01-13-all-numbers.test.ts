// このファイルは書き換えないでください
import { afterEach, expect, expectTypeOf, test, vi } from "vitest";
import { allNumbers } from "../src/q01-13-all-numbers";
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

test("問13 allNumbers", async () => {
  await expect(allNumbers([later(1, 10), Promise.resolve(2)])).resolves.toEqual([1, 2]);
  await expect(allNumbers([Promise.resolve(1), Promise.reject(new Error("x"))])).rejects.toThrow(
    "x",
  );
  expectTypeOf(allNumbers).returns.toEqualTypeOf<Promise<number[]>>();
});
