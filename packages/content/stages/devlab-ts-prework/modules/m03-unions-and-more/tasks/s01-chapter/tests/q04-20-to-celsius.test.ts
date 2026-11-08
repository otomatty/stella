// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { toCelsius, type Reading } from "../src/q04-20-to-celsius";
test("問20 toCelsius", () => {
  expectTypeOf<Reading>().toEqualTypeOf<
    { unit: "C"; value: number } | { unit: "F"; value: number }
  >();
  expect(toCelsius({ unit: "F", value: 212 })).toBe(100);
  expect(toCelsius({ unit: "F", value: 98.6 })).toBe(37);
  expect(toCelsius({ unit: "C", value: 25 })).toBe(25);
  expectTypeOf(toCelsius).parameters.toEqualTypeOf<[Reading]>();
  expectTypeOf(toCelsius).returns.toEqualTypeOf<number>();
});
