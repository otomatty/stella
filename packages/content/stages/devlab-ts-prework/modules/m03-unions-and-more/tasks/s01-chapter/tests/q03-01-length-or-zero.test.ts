// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { lengthOrZero } from "../src/q03-01-length-or-zero";
test("問1 lengthOrZero", () => {
  expect(lengthOrZero("abc")).toBe(3);
  expect(lengthOrZero(undefined)).toBe(0);
  expectTypeOf(lengthOrZero).parameters.toEqualTypeOf<[string | undefined]>();
  expectTypeOf(lengthOrZero).returns.toEqualTypeOf<number>();
});
