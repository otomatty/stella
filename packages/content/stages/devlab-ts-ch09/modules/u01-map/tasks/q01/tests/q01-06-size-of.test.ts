// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { sizeOf } from "../src/q01-06-size-of";
test("問6 sizeOf", () => {
  expect(sizeOf(new Map([["a", 1]]))).toBe(1);
  expect(sizeOf(new Map())).toBe(0);
  expectTypeOf(sizeOf).parameters.toEqualTypeOf<[Map<string, number>]>();
  expectTypeOf(sizeOf).returns.toEqualTypeOf<number>();
});
