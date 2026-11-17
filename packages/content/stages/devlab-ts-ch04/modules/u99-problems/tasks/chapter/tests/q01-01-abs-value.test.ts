// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { absValue } from "../src/q01-01-abs-value";
test("問1 absValue", () => {
  expect(absValue(-5)).toBe(5);
  expect(absValue(3)).toBe(3);
  expect(absValue(0)).toBe(0);
  expectTypeOf(absValue).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(absValue).returns.toEqualTypeOf<number>();
});
