// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { isSameSign } from "../src/q06-15-is-same-sign";
test("問15 isSameSign", () => {
  expect(isSameSign(2, 5)).toBe(true);
  expect(isSameSign(-2, -5)).toBe(true);
  expect(isSameSign(-2, 5)).toBe(false);
  expect(isSameSign(0, 5)).toBe(false);
  expectTypeOf(isSameSign).parameters.toEqualTypeOf<[number, number]>();
  expectTypeOf(isSameSign).returns.toEqualTypeOf<boolean>();
});
