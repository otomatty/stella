// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { bitLength } from "../src/q04-15-bit-length";
test("問15 bitLength", () => {
  expect(bitLength(10)).toBe(4);
  expect(bitLength(1)).toBe(1);
  expect(bitLength(0)).toBe(1);
  expectTypeOf(bitLength).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(bitLength).returns.toEqualTypeOf<number>();
});
