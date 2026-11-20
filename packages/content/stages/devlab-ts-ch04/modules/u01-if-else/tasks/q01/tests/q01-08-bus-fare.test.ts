// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { busFare } from "../src/q01-08-bus-fare";
test("問8 busFare", () => {
  expect(busFare(5)).toBe(0);
  expect(busFare(12)).toBe(120);
  expect(busFare(13)).toBe(240);
  expectTypeOf(busFare).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(busFare).returns.toEqualTypeOf<number>();
});
