// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { fahrenheitToCelsius } from "../src/q04-20-fahrenheit-to-celsius";
test("問20 fahrenheitToCelsius", () => {
  expect(fahrenheitToCelsius(98.6)).toBe(37);
  expect(fahrenheitToCelsius(212)).toBe(100);
  expect(fahrenheitToCelsius(50)).toBe(10);
  expectTypeOf(fahrenheitToCelsius).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(fahrenheitToCelsius).returns.toEqualTypeOf<number>();
});
