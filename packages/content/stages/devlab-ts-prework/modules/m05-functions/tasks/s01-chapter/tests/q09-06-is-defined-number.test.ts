// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { isDefinedNumber } from "../src/q09-06-is-defined-number";
test("問6 isDefinedNumber", () => {
  expect(isDefinedNumber(0)).toBe(true);
  expect(isDefinedNumber(undefined)).toBe(false);
  expectTypeOf(isDefinedNumber).parameters.toEqualTypeOf<[number | undefined]>();
  expectTypeOf(isDefinedNumber).guards.toEqualTypeOf<number>();
});
