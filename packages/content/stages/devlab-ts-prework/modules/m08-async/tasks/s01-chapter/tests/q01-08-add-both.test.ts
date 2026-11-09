// このファイルは書き換えないでください
import { afterEach, expect, expectTypeOf, test, vi } from "vitest";
import { addBoth } from "../src/q01-08-add-both";
afterEach(() => {
  vi.useRealTimers();
});

test("問8 addBoth", async () => {
  await expect(addBoth(Promise.resolve(1), Promise.resolve(2))).resolves.toBe(3);
  expectTypeOf(addBoth).parameters.toEqualTypeOf<[Promise<number>, Promise<number>]>();
  expectTypeOf(addBoth).returns.toEqualTypeOf<Promise<number>>();
});
