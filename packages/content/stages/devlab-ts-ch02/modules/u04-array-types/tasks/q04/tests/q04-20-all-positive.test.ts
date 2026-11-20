// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { allPositive } from "../src/q04-20-all-positive";
test("問20 allPositive", () => {
  expect(allPositive([1, 2, 3])).toBe(true);
  expect(allPositive([1, 0, 3])).toBe(false);
  expectTypeOf(allPositive).parameters.toEqualTypeOf<[readonly number[]]>();
  expectTypeOf(allPositive).returns.toEqualTypeOf<boolean>();
});
