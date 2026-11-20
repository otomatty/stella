// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { compare } from "../src/q07-17-compare";
test("問17 compare", () => {
  expect(compare(2, 5)).toBe(-1);
  expect(compare(5, 5)).toBe(0);
  expect(compare(9, 5)).toBe(1);
  expectTypeOf(compare).parameters.toEqualTypeOf<[number, number]>();
  expectTypeOf(compare).returns.toEqualTypeOf<-1 | 0 | 1>();
});
