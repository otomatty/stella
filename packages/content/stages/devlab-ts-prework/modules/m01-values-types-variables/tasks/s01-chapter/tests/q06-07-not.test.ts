// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { not } from "../src/q06-07-not";
test("問7 not", () => {
  expect(not(true)).toBe(false);
  expect(not(false)).toBe(true);
  expectTypeOf(not).parameters.toEqualTypeOf<[boolean]>();
  expectTypeOf(not).returns.toEqualTypeOf<boolean>();
});
