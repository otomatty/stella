// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import {
  roundOff,
  floorTo10,
  ceilTo100,
  absDiff,
  remainder,
  isMultipleOf,
  cube,
  squareRoot,
  clamp,
  toFixed1,
  parseIntOrZero,
  isFiniteNumber,
  percentOf,
  average2,
  minutesToSeconds,
  kmToMeters,
  hypotenuse,
  digitCount,
  roundTo2,
  fahrenheitToCelsius,
} from "../src/q04-number.drill";

test("問1 roundOff", () => {
  expect(roundOff(2.5)).toBe(3);
  expect(roundOff(2.4)).toBe(2);
  expectTypeOf(roundOff).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(roundOff).returns.toEqualTypeOf<number>();
});

test("問2 floorTo10", () => {
  expect(floorTo10(123)).toBe(120);
  expect(floorTo10(9)).toBe(0);
  expectTypeOf(floorTo10).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(floorTo10).returns.toEqualTypeOf<number>();
});

test("問3 ceilTo100", () => {
  expect(ceilTo100(101)).toBe(200);
  expect(ceilTo100(100)).toBe(100);
  expectTypeOf(ceilTo100).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(ceilTo100).returns.toEqualTypeOf<number>();
});

test("問4 absDiff", () => {
  expect(absDiff(3, 10)).toBe(7);
  expect(absDiff(10, 3)).toBe(7);
  expectTypeOf(absDiff).parameters.toEqualTypeOf<[number, number]>();
  expectTypeOf(absDiff).returns.toEqualTypeOf<number>();
});

test("問5 remainder", () => {
  expect(remainder(10, 3)).toBe(1);
  expect(remainder(9, 3)).toBe(0);
  expectTypeOf(remainder).parameters.toEqualTypeOf<[number, number]>();
  expectTypeOf(remainder).returns.toEqualTypeOf<number>();
});

test("問6 isMultipleOf", () => {
  expect(isMultipleOf(12, 4)).toBe(true);
  expect(isMultipleOf(10, 4)).toBe(false);
  expectTypeOf(isMultipleOf).parameters.toEqualTypeOf<[number, number]>();
  expectTypeOf(isMultipleOf).returns.toEqualTypeOf<boolean>();
});

test("問7 cube", () => {
  expect(cube(3)).toBe(27);
  expect(cube(-2)).toBe(-8);
  expectTypeOf(cube).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(cube).returns.toEqualTypeOf<number>();
});

test("問8 squareRoot", () => {
  expect(squareRoot(9)).toBe(3);
  expect(squareRoot(2)).toBeCloseTo(1.41421);
  expect(() => squareRoot(-1)).toThrow(Error);
  expectTypeOf(squareRoot).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(squareRoot).returns.toEqualTypeOf<number>();
});

test("問9 clamp", () => {
  expect(clamp(15, 0, 10)).toBe(10);
  expect(clamp(-5, 0, 10)).toBe(0);
  expect(clamp(5, 0, 10)).toBe(5);
  expectTypeOf(clamp).parameters.toEqualTypeOf<[number, number, number]>();
  expectTypeOf(clamp).returns.toEqualTypeOf<number>();
});

test("問10 toFixed1", () => {
  expect(toFixed1(3.14159)).toBe("3.1");
  expect(toFixed1(2)).toBe("2.0");
  expectTypeOf(toFixed1).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(toFixed1).returns.toEqualTypeOf<string>();
});

test("問11 parseIntOrZero", () => {
  expect(parseIntOrZero("42px")).toBe(42);
  expect(parseIntOrZero("abc")).toBe(0);
  expect(parseIntOrZero("-7")).toBe(-7);
  expectTypeOf(parseIntOrZero).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(parseIntOrZero).returns.toEqualTypeOf<number>();
});

test("問12 isFiniteNumber", () => {
  expect(isFiniteNumber(1.5)).toBe(true);
  expect(isFiniteNumber(NaN)).toBe(false);
  expect(isFiniteNumber(-Infinity)).toBe(false);
  expectTypeOf(isFiniteNumber).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(isFiniteNumber).returns.toEqualTypeOf<boolean>();
});

test("問13 percentOf", () => {
  expect(percentOf(1, 3)).toBe(33);
  expect(percentOf(2, 3)).toBe(67);
  expect(percentOf(5, 5)).toBe(100);
  expectTypeOf(percentOf).parameters.toEqualTypeOf<[number, number]>();
  expectTypeOf(percentOf).returns.toEqualTypeOf<number>();
});

test("問14 average2", () => {
  expect(average2(3, 8)).toBe(5.5);
  expect(average2(-2, 2)).toBe(0);
  expectTypeOf(average2).parameters.toEqualTypeOf<[number, number]>();
  expectTypeOf(average2).returns.toEqualTypeOf<number>();
});

test("問15 minutesToSeconds", () => {
  expect(minutesToSeconds(1.5)).toBe(90);
  expect(minutesToSeconds(0)).toBe(0);
  expectTypeOf(minutesToSeconds).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(minutesToSeconds).returns.toEqualTypeOf<number>();
});

test("問16 kmToMeters", () => {
  expect(kmToMeters(1.5)).toBe(1500);
  expect(kmToMeters(42.195)).toBe(42195);
  expectTypeOf(kmToMeters).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(kmToMeters).returns.toEqualTypeOf<number>();
});

test("問17 hypotenuse", () => {
  expect(hypotenuse(3, 4)).toBe(5);
  expect(hypotenuse(5, 12)).toBe(13);
  expectTypeOf(hypotenuse).parameters.toEqualTypeOf<[number, number]>();
  expectTypeOf(hypotenuse).returns.toEqualTypeOf<number>();
});

test("問18 digitCount", () => {
  expect(digitCount(12345)).toBe(5);
  expect(digitCount(0)).toBe(1);
  expectTypeOf(digitCount).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(digitCount).returns.toEqualTypeOf<number>();
});

test("問19 roundTo2", () => {
  expect(roundTo2(1.234)).toBe(1.23);
  expect(roundTo2(9.876)).toBe(9.88);
  expect(roundTo2(3)).toBe(3);
  expectTypeOf(roundTo2).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(roundTo2).returns.toEqualTypeOf<number>();
});

test("問20 fahrenheitToCelsius", () => {
  expect(fahrenheitToCelsius(98.6)).toBe(37);
  expect(fahrenheitToCelsius(212)).toBe(100);
  expect(fahrenheitToCelsius(50)).toBe(10);
  expectTypeOf(fahrenheitToCelsius).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(fahrenheitToCelsius).returns.toEqualTypeOf<number>();
});
