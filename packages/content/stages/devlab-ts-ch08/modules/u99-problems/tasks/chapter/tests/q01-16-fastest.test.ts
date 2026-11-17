// このファイルは書き換えないでください
import { afterEach, expect, expectTypeOf, test, vi } from "vitest";
import { fastest } from "../src/q01-16-fastest";
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

test("問16 fastest", async () => {
  await expect(fastest([later("遅い", 50), later("速い", 5)])).resolves.toBe("速い");
  expectTypeOf(fastest).returns.toEqualTypeOf<Promise<string>>();
});
