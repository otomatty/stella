// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { numberOrZero } from "../src/q06-03-number-or-zero";
test("問3 numberOrZero", () => {
  expect(numberOrZero(5)).toBe(5);
  expect(numberOrZero("5")).toBe(0);
  expectTypeOf(numberOrZero).parameters.toEqualTypeOf<[unknown]>();
  expectTypeOf(numberOrZero).returns.toEqualTypeOf<number>();
});
