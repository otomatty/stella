// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { isMultipleOf } from "../src/q04-06-is-multiple-of";
test("問6 isMultipleOf", () => {
  expect(isMultipleOf(12, 4)).toBe(true);
  expect(isMultipleOf(10, 4)).toBe(false);
  expectTypeOf(isMultipleOf).parameters.toEqualTypeOf<[number, number]>();
  expectTypeOf(isMultipleOf).returns.toEqualTypeOf<boolean>();
});
