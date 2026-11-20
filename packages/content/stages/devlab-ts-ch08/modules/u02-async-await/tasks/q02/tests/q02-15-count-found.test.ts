// このファイルは書き換えないでください
import { afterEach, expect, expectTypeOf, test, vi } from "vitest";
import { countFound } from "../src/q02-15-count-found";
afterEach(() => {
  vi.useRealTimers();
});

test("問15 countFound", async () => {
  await expect(countFound([1, 9, 3, 8])).resolves.toBe(2);
  await expect(countFound([])).resolves.toBe(0);
  expectTypeOf(countFound).returns.toEqualTypeOf<Promise<number>>();
});
