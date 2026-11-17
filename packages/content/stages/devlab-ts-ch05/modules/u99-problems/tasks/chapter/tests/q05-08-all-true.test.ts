// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { allTrue } from "../src/q05-08-all-true";
test("問8 allTrue", () => {
  expect(allTrue(true, true)).toBe(true);
  expect(allTrue(true, false)).toBe(false);
  expect(allTrue()).toBe(true);
  expectTypeOf(allTrue).parameters.toEqualTypeOf<boolean[]>();
  expectTypeOf(allTrue).returns.toEqualTypeOf<boolean>();
});
