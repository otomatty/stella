// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { isBetween } from "../src/q02-16-is-between";
test("問16 isBetween", () => {
  expect(isBetween(5, 1, 10)).toBe(true);
  expect(isBetween(10, 1, 10)).toBe(true);
  expect(isBetween(11, 1, 10)).toBe(false);
  expectTypeOf(isBetween).parameters.toEqualTypeOf<[number, number, number]>();
  expectTypeOf(isBetween).returns.toEqualTypeOf<boolean>();
});
