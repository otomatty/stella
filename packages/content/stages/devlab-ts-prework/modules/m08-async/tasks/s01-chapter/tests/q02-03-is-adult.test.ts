// このファイルは書き換えないでください
import { afterEach, expect, expectTypeOf, test, vi } from "vitest";
import { isAdult } from "../src/q02-03-is-adult";
afterEach(() => {
  vi.useRealTimers();
});

test("問3 isAdult", async () => {
  await expect(isAdult(4)).resolves.toBe(true);
  await expect(isAdult(2)).resolves.toBe(false);
  expectTypeOf(isAdult).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(isAdult).returns.toEqualTypeOf<Promise<boolean>>();
});
