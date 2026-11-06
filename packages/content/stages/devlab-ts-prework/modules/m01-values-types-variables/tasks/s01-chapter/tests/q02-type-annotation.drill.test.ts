// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import {
  subtract,
  honorific,
  isAdult,
  repeatText,
  rectangleArea,
  fullName,
  celsiusToFahrenheit,
  isEven,
  greet,
  initial,
  discountPrice,
  formatYen,
  isLongerThan,
  half,
  labelWithCount,
  isBetween,
  secondsToMinutes,
  shout,
  canDrive,
  line,
} from "../src/q02-type-annotation.drill";

test("問1 subtract", () => {
  expect(subtract(5, 3)).toBe(2);
  expect(subtract(0, 7)).toBe(-7);
  expectTypeOf(subtract).parameters.toEqualTypeOf<[number, number]>();
  expectTypeOf(subtract).returns.toEqualTypeOf<number>();
});

test("問2 honorific", () => {
  expect(honorific("山田")).toBe("山田さん");
  expect(honorific("Taro")).toBe("Taroさん");
  expectTypeOf(honorific).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(honorific).returns.toEqualTypeOf<string>();
});

test("問3 isAdult", () => {
  expect(isAdult(18)).toBe(true);
  expect(isAdult(17)).toBe(false);
  expectTypeOf(isAdult).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(isAdult).returns.toEqualTypeOf<boolean>();
});

test("問4 repeatText", () => {
  expect(repeatText("ab", 3)).toBe("ababab");
  expect(repeatText("x", 0)).toBe("");
  expectTypeOf(repeatText).parameters.toEqualTypeOf<[string, number]>();
  expectTypeOf(repeatText).returns.toEqualTypeOf<string>();
});

test("問5 rectangleArea", () => {
  expect(rectangleArea(3, 4)).toBe(12);
  expect(rectangleArea(10, 0)).toBe(0);
  expectTypeOf(rectangleArea).parameters.toEqualTypeOf<[number, number]>();
  expectTypeOf(rectangleArea).returns.toEqualTypeOf<number>();
});

test("問6 fullName", () => {
  expect(fullName("山田", "太郎")).toBe("山田 太郎");
  expectTypeOf(fullName).parameters.toEqualTypeOf<[string, string]>();
  expectTypeOf(fullName).returns.toEqualTypeOf<string>();
});

test("問7 celsiusToFahrenheit", () => {
  expect(celsiusToFahrenheit(100)).toBe(212);
  expect(celsiusToFahrenheit(0)).toBe(32);
  expectTypeOf(celsiusToFahrenheit).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(celsiusToFahrenheit).returns.toEqualTypeOf<number>();
});

test("問8 isEven", () => {
  expect(isEven(4)).toBe(true);
  expect(isEven(7)).toBe(false);
  expect(isEven(0)).toBe(true);
  expectTypeOf(isEven).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(isEven).returns.toEqualTypeOf<boolean>();
});

test("問9 greet", () => {
  expect(greet("山田", 9)).toBe("おはよう、山田さん");
  expect(greet("佐藤", 12)).toBe("こんにちは、佐藤さん");
  expectTypeOf(greet).parameters.toEqualTypeOf<[string, number]>();
  expectTypeOf(greet).returns.toEqualTypeOf<string>();
});

test("問10 initial", () => {
  expect(initial("Taro")).toBe("T");
  expect(initial("山田")).toBe("山");
  expectTypeOf(initial).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(initial).returns.toEqualTypeOf<string>();
});

test("問11 discountPrice", () => {
  expect(discountPrice(1000, 15)).toBe(850);
  expect(discountPrice(999, 10)).toBe(899);
  expectTypeOf(discountPrice).parameters.toEqualTypeOf<[number, number]>();
  expectTypeOf(discountPrice).returns.toEqualTypeOf<number>();
});

test("問12 formatYen", () => {
  expect(formatYen(1234)).toBe("1,234円");
  expect(formatYen(1000000)).toBe("1,000,000円");
  expectTypeOf(formatYen).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(formatYen).returns.toEqualTypeOf<string>();
});

test("問13 isLongerThan", () => {
  expect(isLongerThan("hello", 3)).toBe(true);
  expect(isLongerThan("hi", 2)).toBe(false);
  expectTypeOf(isLongerThan).parameters.toEqualTypeOf<[string, number]>();
  expectTypeOf(isLongerThan).returns.toEqualTypeOf<boolean>();
});

test("問14 half", () => {
  expect(half(7)).toBe(3.5);
  expect(half(-4)).toBe(-2);
  expectTypeOf(half).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(half).returns.toEqualTypeOf<number>();
});

test("問15 labelWithCount", () => {
  expect(labelWithCount("メッセージ", 3)).toBe("メッセージ（3件）");
  expect(labelWithCount("通知", 0)).toBe("通知（0件）");
  expectTypeOf(labelWithCount).parameters.toEqualTypeOf<[string, number]>();
  expectTypeOf(labelWithCount).returns.toEqualTypeOf<string>();
});

test("問16 isBetween", () => {
  expect(isBetween(5, 1, 10)).toBe(true);
  expect(isBetween(10, 1, 10)).toBe(true);
  expect(isBetween(11, 1, 10)).toBe(false);
  expectTypeOf(isBetween).parameters.toEqualTypeOf<[number, number, number]>();
  expectTypeOf(isBetween).returns.toEqualTypeOf<boolean>();
});

test("問17 secondsToMinutes", () => {
  expect(secondsToMinutes(150)).toBe(2);
  expect(secondsToMinutes(59)).toBe(0);
  expectTypeOf(secondsToMinutes).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(secondsToMinutes).returns.toEqualTypeOf<number>();
});

test("問18 shout", () => {
  expect(shout("hello")).toBe("HELLO!");
  expect(shout("Agora")).toBe("AGORA!");
  expectTypeOf(shout).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(shout).returns.toEqualTypeOf<string>();
});

test("問19 canDrive", () => {
  expect(canDrive(20, true)).toBe(true);
  expect(canDrive(20, false)).toBe(false);
  expect(canDrive(17, true)).toBe(false);
  expectTypeOf(canDrive).parameters.toEqualTypeOf<[number, boolean]>();
  expectTypeOf(canDrive).returns.toEqualTypeOf<boolean>();
});

test("問20 line", () => {
  expect(line("=", 5)).toBe("=====");
  expect(line("-", 1)).toBe("-");
  expectTypeOf(line).parameters.toEqualTypeOf<[string, number]>();
  expectTypeOf(line).returns.toEqualTypeOf<string>();
});
