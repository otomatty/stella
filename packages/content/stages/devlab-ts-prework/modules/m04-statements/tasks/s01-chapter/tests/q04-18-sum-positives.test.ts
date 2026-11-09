// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { sumPositives } from "../src/q04-18-sum-positives";
test("問18 sumPositives", () => {
  expect(sumPositives([3, -1, 0, 5])).toBe(8);
  expect(sumPositives([])).toBe(0);
  expectTypeOf(sumPositives).parameters.toEqualTypeOf<[readonly number[]]>();
  expectTypeOf(sumPositives).returns.toEqualTypeOf<number>();
});
