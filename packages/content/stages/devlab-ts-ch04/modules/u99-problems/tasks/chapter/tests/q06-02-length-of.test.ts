// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { lengthOf } from "../src/q06-02-length-of";
test("問2 lengthOf", () => {
  expect(lengthOf("abc")).toBe(3);
  expect(lengthOf([1, 2, 3])).toBe(3);
  expect(lengthOf(42)).toBe(0);
  expectTypeOf(lengthOf).parameters.toEqualTypeOf<[unknown]>();
  expectTypeOf(lengthOf).returns.toEqualTypeOf<number>();
});
