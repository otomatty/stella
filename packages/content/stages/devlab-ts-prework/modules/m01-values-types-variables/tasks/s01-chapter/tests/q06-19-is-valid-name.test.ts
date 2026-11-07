// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { isValidName } from "../src/q06-19-is-valid-name";
test("問19 isValidName", () => {
  expect(isValidName("山田", 10)).toBe(true);
  expect(isValidName("", 10)).toBe(false);
  expect(isValidName("abcdefghijk", 10)).toBe(false);
  expectTypeOf(isValidName).parameters.toEqualTypeOf<[string, number]>();
  expectTypeOf(isValidName).returns.toEqualTypeOf<boolean>();
});
