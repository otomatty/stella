// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { isMultipleOf3Or5 } from "../src/q06-17-is-multiple-of3-or5";
test("問17 isMultipleOf3Or5", () => {
  expect(isMultipleOf3Or5(9)).toBe(true);
  expect(isMultipleOf3Or5(10)).toBe(true);
  expect(isMultipleOf3Or5(7)).toBe(false);
  expectTypeOf(isMultipleOf3Or5).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(isMultipleOf3Or5).returns.toEqualTypeOf<boolean>();
});
