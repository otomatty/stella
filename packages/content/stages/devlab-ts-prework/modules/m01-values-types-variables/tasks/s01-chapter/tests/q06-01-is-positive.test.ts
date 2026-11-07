// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { isPositive } from "../src/q06-01-is-positive";
test("問1 isPositive", () => {
  expect(isPositive(3)).toBe(true);
  expect(isPositive(0)).toBe(false);
  expectTypeOf(isPositive).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(isPositive).returns.toEqualTypeOf<boolean>();
});
