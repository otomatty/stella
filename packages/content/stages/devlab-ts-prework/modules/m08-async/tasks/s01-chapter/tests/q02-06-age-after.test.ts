// このファイルは書き換えないでください
import { afterEach, expect, expectTypeOf, test, vi } from "vitest";
import { ageAfter } from "../src/q02-06-age-after";
afterEach(() => {
  vi.useRealTimers();
});

test("問6 ageAfter", async () => {
  await expect(ageAfter(2, 5)).resolves.toBe(24);
  expectTypeOf(ageAfter).parameters.toEqualTypeOf<[number, number]>();
  expectTypeOf(ageAfter).returns.toEqualTypeOf<Promise<number>>();
});
