// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { roundStep } from "../src/q03-15-round-step";
test("問15 roundStep", () => {
  expect(roundStep(17, 5)).toBe(15);
  expect(roundStep(18, 5)).toBe(20);
  expect(roundStep(2.6)).toBe(3);
  expectTypeOf(roundStep).parameters.toEqualTypeOf<[number, number?]>();
  expectTypeOf(roundStep).returns.toEqualTypeOf<number>();
});
