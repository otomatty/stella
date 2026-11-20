// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { bitOf } from "../src/q07-15-bit-of";
test("問15 bitOf", () => {
  expect(bitOf(true)).toBe(1);
  expect(bitOf(false)).toBe(0);
  expectTypeOf(bitOf).parameters.toEqualTypeOf<[boolean]>();
  expectTypeOf(bitOf).returns.toEqualTypeOf<0 | 1>();
});
