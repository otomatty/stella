// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { isOpen } from "../src/q06-20-is-open";
test("問20 isOpen", () => {
  expect(isOpen(9, false)).toBe(true);
  expect(isOpen(18, false)).toBe(false);
  expect(isOpen(9, true)).toBe(false);
  expect(isOpen(14, true)).toBe(true);
  expectTypeOf(isOpen).parameters.toEqualTypeOf<[number, boolean]>();
  expectTypeOf(isOpen).returns.toEqualTypeOf<boolean>();
});
