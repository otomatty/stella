// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { isPlainObject } from "../src/q06-19-is-plain-object";
test("問19 isPlainObject", () => {
  expect(isPlainObject({})).toBe(true);
  expect(isPlainObject([])).toBe(false);
  expect(isPlainObject(null)).toBe(false);
  expect(isPlainObject("a")).toBe(false);
  expectTypeOf(isPlainObject).parameters.toEqualTypeOf<[unknown]>();
  expectTypeOf(isPlainObject).returns.toEqualTypeOf<boolean>();
});
