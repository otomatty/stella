// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { countDigits } from "../src/q04-01-count-digits";
test("問1 countDigits", () => {
  expect(countDigits(12345)).toBe(5);
  expect(countDigits(9)).toBe(1);
  expect(countDigits(10)).toBe(2);
  expectTypeOf(countDigits).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(countDigits).returns.toEqualTypeOf<number>();
});
