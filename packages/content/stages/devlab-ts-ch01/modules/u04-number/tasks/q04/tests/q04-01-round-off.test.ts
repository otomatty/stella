// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { roundOff } from "../src/q04-01-round-off";
test("問1 roundOff", () => {
  expect(roundOff(2.5)).toBe(3);
  expect(roundOff(2.4)).toBe(2);
  expectTypeOf(roundOff).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(roundOff).returns.toEqualTypeOf<number>();
});
