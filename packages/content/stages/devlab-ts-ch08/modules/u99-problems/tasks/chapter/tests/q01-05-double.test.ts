// このファイルは書き換えないでください
import { afterEach, expect, expectTypeOf, test, vi } from "vitest";
import { double } from "../src/q01-05-double";
afterEach(() => {
  vi.useRealTimers();
});

test("問5 double", async () => {
  await expect(double(Promise.resolve(3))).resolves.toBe(6);
  expectTypeOf(double).parameters.toEqualTypeOf<[Promise<number>]>();
  expectTypeOf(double).returns.toEqualTypeOf<Promise<number>>();
});
