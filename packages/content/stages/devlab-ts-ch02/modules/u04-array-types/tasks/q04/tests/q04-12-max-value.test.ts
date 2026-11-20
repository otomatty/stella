// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { maxValue } from "../src/q04-12-max-value";
test("問12 maxValue", () => {
  expect(maxValue([3, 9, 2])).toBe(9);
  expect(() => maxValue([])).toThrow(Error);
  expectTypeOf(maxValue).parameters.toEqualTypeOf<[readonly number[]]>();
  expectTypeOf(maxValue).returns.toEqualTypeOf<number>();
});
