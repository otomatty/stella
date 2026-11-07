// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { quarterOf } from "../src/q02-13-quarter-of";
test("問13 quarterOf", () => {
  expect(quarterOf(1)).toBe(1);
  expect(quarterOf(5)).toBe(2);
  expect(quarterOf(9)).toBe(3);
  expect(quarterOf(12)).toBe(4);
  expect(() => quarterOf(0)).toThrow(Error);
  expectTypeOf(quarterOf).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(quarterOf).returns.toEqualTypeOf<1 | 2 | 3 | 4>();
});
