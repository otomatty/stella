// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { runningTotal } from "../src/q03-15-running-total";
test("問15 runningTotal", () => {
  expect(runningTotal([1, 2, 3])).toEqual([1, 3, 6]);
  expect(runningTotal([])).toEqual([]);
  expectTypeOf(runningTotal).parameters.toEqualTypeOf<[readonly number[]]>();
  expectTypeOf(runningTotal).returns.toEqualTypeOf<number[]>();
});
