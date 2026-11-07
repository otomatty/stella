// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { isEven } from "../src/q02-08-is-even";
test("問8 isEven", () => {
  expect(isEven(4)).toBe(true);
  expect(isEven(7)).toBe(false);
  expect(isEven(0)).toBe(true);
  expectTypeOf(isEven).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(isEven).returns.toEqualTypeOf<boolean>();
});
