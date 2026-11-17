// このファイルは書き換えないでください
import { afterEach, expect, expectTypeOf, test, vi } from "vitest";
import { pairOf } from "../src/q01-15-pair-of";
afterEach(() => {
  vi.useRealTimers();
});

test("問15 pairOf", async () => {
  await expect(pairOf(Promise.resolve("a"), Promise.resolve(1))).resolves.toEqual(["a", 1]);
  expectTypeOf(pairOf).parameters.toEqualTypeOf<[Promise<string>, Promise<number>]>();
  expectTypeOf(pairOf).returns.toEqualTypeOf<Promise<[string, number]>>();
});
