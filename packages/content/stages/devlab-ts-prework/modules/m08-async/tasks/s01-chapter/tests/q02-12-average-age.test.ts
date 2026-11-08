// このファイルは書き換えないでください
import { afterEach, expect, expectTypeOf, test, vi } from "vitest";
import { averageAge } from "../src/q02-12-average-age";
afterEach(() => {
  vi.useRealTimers();
});

test("問12 averageAge", async () => {
  await expect(averageAge([1, 2])).resolves.toBe(26.5);
  await expect(averageAge([])).resolves.toBe(0);
  expectTypeOf(averageAge).returns.toEqualTypeOf<Promise<number>>();
});
