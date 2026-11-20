import { describe, expect, expectTypeOf, test } from "vitest";
import {
  celsiusToFahrenheit,
  convert,
  fahrenheitToCelsius,
  kelvinToCelsius,
} from "../src/q01-function-forms";

type Unit = "C" | "F" | "K";

describe("celsiusToFahrenheit", () => {
  test("摂氏から華氏", () => {
    expect(celsiusToFahrenheit(100)).toBe(212);
    expect(celsiusToFahrenheit(36.6)).toBe(97.88);
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(celsiusToFahrenheit).parameters.toEqualTypeOf<[number]>();
    expectTypeOf(celsiusToFahrenheit).returns.toEqualTypeOf<number>();
  });
});

describe("fahrenheitToCelsius", () => {
  test("華氏から摂氏", () => {
    expect(fahrenheitToCelsius(212)).toBe(100);
    expect(fahrenheitToCelsius(98.6)).toBe(37);
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(fahrenheitToCelsius).parameters.toEqualTypeOf<[number]>();
    expectTypeOf(fahrenheitToCelsius).returns.toEqualTypeOf<number>();
  });
});

describe("kelvinToCelsius", () => {
  test("ケルビンから摂氏", () => {
    expect(kelvinToCelsius(273.15)).toBe(0);
    expect(kelvinToCelsius(300)).toBe(26.85);
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(kelvinToCelsius).parameters.toEqualTypeOf<[number]>();
    expectTypeOf(kelvinToCelsius).returns.toEqualTypeOf<number>();
  });
});

describe("convert", () => {
  test("単位を変換する", () => {
    expect(convert(100, "C", "F")).toBe(212);
    expect(convert(212, "F", "K")).toBe(373.15);
    expect(convert(0, "K", "C")).toBe(-273.15);
    expect(convert(25, "C", "C")).toBe(25);
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(convert).parameters.toEqualTypeOf<[number, Unit, Unit]>();
    expectTypeOf(convert).returns.toEqualTypeOf<number>();
  });
});
