// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { divisibleTimes } from "../src/q04-17-divisible-times";
test("問17 divisibleTimes", () => {
  expect(divisibleTimes(48, 2)).toBe(4);
  expect(divisibleTimes(81, 3)).toBe(4);
  expect(divisibleTimes(7, 2)).toBe(0);
  expectTypeOf(divisibleTimes).parameters.toEqualTypeOf<[number, number]>();
  expectTypeOf(divisibleTimes).returns.toEqualTypeOf<number>();
});
