// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { stepsToZero } from "../src/q04-04-steps-to-zero";
test("問4 stepsToZero", () => {
  expect(stepsToZero(14)).toBe(6);
  expect(stepsToZero(1)).toBe(1);
  expect(stepsToZero(0)).toBe(0);
  expectTypeOf(stepsToZero).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(stepsToZero).returns.toEqualTypeOf<number>();
});
