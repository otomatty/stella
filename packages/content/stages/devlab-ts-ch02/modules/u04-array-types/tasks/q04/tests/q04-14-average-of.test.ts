// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { averageOf } from "../src/q04-14-average-of";
test("問14 averageOf", () => {
  expect(averageOf([2, 4, 9])).toBe(5);
  expect(averageOf([])).toBe(0);
  expectTypeOf(averageOf).parameters.toEqualTypeOf<[readonly number[]]>();
  expectTypeOf(averageOf).returns.toEqualTypeOf<number>();
});
