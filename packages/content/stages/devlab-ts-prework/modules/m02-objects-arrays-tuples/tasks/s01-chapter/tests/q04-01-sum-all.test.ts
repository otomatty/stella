// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { sumAll } from "../src/q04-01-sum-all";
test("問1 sumAll", () => {
  expect(sumAll([1, 2, 3])).toBe(6);
  expect(sumAll([])).toBe(0);
  expectTypeOf(sumAll).parameters.toEqualTypeOf<[readonly number[]]>();
  expectTypeOf(sumAll).returns.toEqualTypeOf<number>();
});
