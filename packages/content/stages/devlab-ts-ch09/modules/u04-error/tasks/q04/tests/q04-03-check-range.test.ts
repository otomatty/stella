// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { checkRange } from "../src/q04-03-check-range";
test("問3 checkRange", () => {
  expect(checkRange(5, 1, 10)).toBe(5);
  expect(checkRange(10, 1, 10)).toBe(10);
  expect(() => checkRange(11, 1, 10)).toThrow(RangeError);
  expect(() => checkRange(0, 1, 10)).toThrow("0 は 1〜10 の範囲外です");
  expectTypeOf(checkRange).parameters.toEqualTypeOf<[number, number, number]>();
  expectTypeOf(checkRange).returns.toEqualTypeOf<number>();
});
