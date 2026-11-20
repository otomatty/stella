// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { sumEvenIndex } from "../src/q04-19-sum-even-index";
test("問19 sumEvenIndex", () => {
  expect(sumEvenIndex([1, 2, 3, 4, 5])).toBe(9);
  expect(sumEvenIndex([])).toBe(0);
  expectTypeOf(sumEvenIndex).parameters.toEqualTypeOf<[readonly number[]]>();
  expectTypeOf(sumEvenIndex).returns.toEqualTypeOf<number>();
});
