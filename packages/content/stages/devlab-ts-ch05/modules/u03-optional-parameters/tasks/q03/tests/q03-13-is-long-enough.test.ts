// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { isLongEnough } from "../src/q03-13-is-long-enough";
test("問13 isLongEnough", () => {
  expect(isLongEnough("abcdefgh")).toBe(true);
  expect(isLongEnough("abc")).toBe(false);
  expect(isLongEnough("abc", 3)).toBe(true);
  expectTypeOf(isLongEnough).parameters.toEqualTypeOf<[string, number?]>();
  expectTypeOf(isLongEnough).returns.toEqualTypeOf<boolean>();
});
