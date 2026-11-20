// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { isMultipleOf7 } from "../src/q01-13-is-multiple-of7";
test("問13 isMultipleOf7", () => {
  expect(isMultipleOf7(21)).toBe(true);
  expect(isMultipleOf7(22)).toBe(false);
  expectTypeOf(isMultipleOf7).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(isMultipleOf7).returns.toEqualTypeOf<boolean>();
});
