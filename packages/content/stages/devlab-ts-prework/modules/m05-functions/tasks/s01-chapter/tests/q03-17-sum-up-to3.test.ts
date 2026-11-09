// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { sumUpTo3 } from "../src/q03-17-sum-up-to3";
test("問17 sumUpTo3", () => {
  expect(sumUpTo3(1)).toBe(1);
  expect(sumUpTo3(1, 2)).toBe(3);
  expect(sumUpTo3(1, 2, 3)).toBe(6);
  expectTypeOf(sumUpTo3).parameters.toEqualTypeOf<[number, number?, number?]>();
  expectTypeOf(sumUpTo3).returns.toEqualTypeOf<number>();
});
