// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { minValue } from "../src/q04-13-min-value";
test("問13 minValue", () => {
  expect(minValue([3, 9, 2])).toBe(2);
  expect(() => minValue([])).toThrow(Error);
  expectTypeOf(minValue).parameters.toEqualTypeOf<[readonly number[]]>();
  expectTypeOf(minValue).returns.toEqualTypeOf<number>();
});
