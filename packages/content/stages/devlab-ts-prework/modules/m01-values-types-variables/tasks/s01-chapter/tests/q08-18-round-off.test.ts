// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { roundOff } from "../src/q08-18-round-off";
test("問18 roundOff", () => {
  expect(roundOff(2.6)).toBe(3);
  expectTypeOf(roundOff).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(roundOff).returns.toEqualTypeOf<number>();
});
