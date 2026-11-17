// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { powerOfTwoAtLeast } from "../src/q04-03-power-of-two-at-least";
test("問3 powerOfTwoAtLeast", () => {
  expect(powerOfTwoAtLeast(5)).toBe(8);
  expect(powerOfTwoAtLeast(8)).toBe(8);
  expect(powerOfTwoAtLeast(1)).toBe(1);
  expectTypeOf(powerOfTwoAtLeast).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(powerOfTwoAtLeast).returns.toEqualTypeOf<number>();
});
