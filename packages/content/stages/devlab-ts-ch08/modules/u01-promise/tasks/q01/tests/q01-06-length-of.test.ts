// このファイルは書き換えないでください
import { afterEach, expect, expectTypeOf, test, vi } from "vitest";
import { lengthOf } from "../src/q01-06-length-of";
afterEach(() => {
  vi.useRealTimers();
});

test("問6 lengthOf", async () => {
  await expect(lengthOf(Promise.resolve("abc"))).resolves.toBe(3);
  await expect(lengthOf(Promise.resolve(""))).resolves.toBe(0);
  expectTypeOf(lengthOf).parameters.toEqualTypeOf<[Promise<string>]>();
  expectTypeOf(lengthOf).returns.toEqualTypeOf<Promise<number>>();
});
