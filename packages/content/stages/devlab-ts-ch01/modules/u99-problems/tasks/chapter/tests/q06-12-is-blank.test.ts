// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { isBlank } from "../src/q06-12-is-blank";
test("問12 isBlank", () => {
  expect(isBlank("   ")).toBe(true);
  expect(isBlank("")).toBe(true);
  expect(isBlank(" a ")).toBe(false);
  expectTypeOf(isBlank).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(isBlank).returns.toEqualTypeOf<boolean>();
});
