// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { celsiusToFahrenheit } from "../src/q02-07-celsius-to-fahrenheit";
test("問7 celsiusToFahrenheit", () => {
  expect(celsiusToFahrenheit(100)).toBe(212);
  expect(celsiusToFahrenheit(0)).toBe(32);
  expectTypeOf(celsiusToFahrenheit).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(celsiusToFahrenheit).returns.toEqualTypeOf<number>();
});
