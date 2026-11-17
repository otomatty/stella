// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { isFiniteNumber } from "../src/q04-12-is-finite-number";
test("問12 isFiniteNumber", () => {
  expect(isFiniteNumber(1.5)).toBe(true);
  expect(isFiniteNumber(NaN)).toBe(false);
  expect(isFiniteNumber(-Infinity)).toBe(false);
  expectTypeOf(isFiniteNumber).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(isFiniteNumber).returns.toEqualTypeOf<boolean>();
});
