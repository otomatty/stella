// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { inRange } from "../src/q03-19-in-range";
test("問19 inRange", () => {
  expect(inRange(50)).toBe(true);
  expect(inRange(150)).toBe(false);
  expect(inRange(150, 0, 200)).toBe(true);
  expectTypeOf(inRange).parameters.toEqualTypeOf<[number, number?, number?]>();
  expectTypeOf(inRange).returns.toEqualTypeOf<boolean>();
});
