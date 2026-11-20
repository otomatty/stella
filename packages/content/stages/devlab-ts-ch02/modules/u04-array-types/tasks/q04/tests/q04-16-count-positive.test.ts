// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { countPositive } from "../src/q04-16-count-positive";
test("問16 countPositive", () => {
  expect(countPositive([3, -1, 0, 5])).toBe(2);
  expect(countPositive([])).toBe(0);
  expectTypeOf(countPositive).parameters.toEqualTypeOf<[readonly number[]]>();
  expectTypeOf(countPositive).returns.toEqualTypeOf<number>();
});
