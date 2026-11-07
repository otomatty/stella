// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { isOdd } from "../src/q06-03-is-odd";
test("問3 isOdd", () => {
  expect(isOdd(3)).toBe(true);
  expect(isOdd(-3)).toBe(true);
  expect(isOdd(4)).toBe(false);
  expectTypeOf(isOdd).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(isOdd).returns.toEqualTypeOf<boolean>();
});
