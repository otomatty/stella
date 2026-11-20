// このファイルは書き換えないでください
import { afterEach, expect, expectTypeOf, test, vi } from "vitest";
import { sumAges } from "../src/q02-07-sum-ages";
afterEach(() => {
  vi.useRealTimers();
});

test("問7 sumAges", async () => {
  await expect(sumAges(1, 2)).resolves.toBe(53);
  expectTypeOf(sumAges).parameters.toEqualTypeOf<[number, number]>();
  expectTypeOf(sumAges).returns.toEqualTypeOf<Promise<number>>();
});
