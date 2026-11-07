// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { both } from "../src/q06-08-both";
test("問8 both", () => {
  expect(both(true, true)).toBe(true);
  expect(both(true, false)).toBe(false);
  expectTypeOf(both).parameters.toEqualTypeOf<[boolean, boolean]>();
  expectTypeOf(both).returns.toEqualTypeOf<boolean>();
});
