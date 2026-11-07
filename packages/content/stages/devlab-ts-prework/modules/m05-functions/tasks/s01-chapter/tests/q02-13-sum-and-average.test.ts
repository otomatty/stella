// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { sumAndAverage } from "../src/q02-13-sum-and-average";
test("問13 sumAndAverage", () => {
  expect(sumAndAverage([1, 2, 3])).toEqual({ sum: 6, average: 2 });
  expect(sumAndAverage([])).toEqual({ sum: 0, average: 0 });
  expectTypeOf(sumAndAverage).parameters.toEqualTypeOf<[readonly number[]]>();
  expectTypeOf(sumAndAverage).returns.toEqualTypeOf<{ sum: number; average: number }>();
});
