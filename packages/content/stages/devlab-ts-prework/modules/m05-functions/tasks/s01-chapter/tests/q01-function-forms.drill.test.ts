// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import {
  add3,
  cubeOf,
  initials,
  toMinutes,
  isAllUpper,
  circleArea,
  isWeekendDay,
  half,
  negate,
  quote,
  kmToMiles,
  percentText,
  isMultipleOf7,
  lastWord,
  triple,
  isPositiveNumber,
  firstWord,
  countSpaces,
  average2,
  describeTemp,
} from "../src/q01-function-forms.drill";

test("問1 add3", () => {
  expect(add3(1, 2, 3)).toBe(6);
  expectTypeOf(add3).parameters.toEqualTypeOf<[number, number, number]>();
  expectTypeOf(add3).returns.toEqualTypeOf<number>();
});

test("問2 cubeOf", () => {
  expect(cubeOf(3)).toBe(27);
  expect(cubeOf(-2)).toBe(-8);
  expectTypeOf(cubeOf).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(cubeOf).returns.toEqualTypeOf<number>();
});

test("問3 initials", () => {
  expect(initials("Taro", "Yamada")).toBe("T.Y.");
  expectTypeOf(initials).parameters.toEqualTypeOf<[string, string]>();
  expectTypeOf(initials).returns.toEqualTypeOf<string>();
});

test("問4 toMinutes", () => {
  expect(toMinutes(9, 30)).toBe(570);
  expect(toMinutes(0, 0)).toBe(0);
  expectTypeOf(toMinutes).parameters.toEqualTypeOf<[number, number]>();
  expectTypeOf(toMinutes).returns.toEqualTypeOf<number>();
});

test("問5 isAllUpper", () => {
  expect(isAllUpper("ABC")).toBe(true);
  expect(isAllUpper("AbC")).toBe(false);
  expect(isAllUpper("123")).toBe(false);
  expectTypeOf(isAllUpper).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(isAllUpper).returns.toEqualTypeOf<boolean>();
});

test("問6 circleArea", () => {
  expect(circleArea(1)).toBeCloseTo(Math.PI);
  expect(circleArea(0)).toBe(0);
  expectTypeOf(circleArea).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(circleArea).returns.toEqualTypeOf<number>();
});

test("問7 isWeekendDay", () => {
  expect(isWeekendDay(6)).toBe(true);
  expect(isWeekendDay(3)).toBe(false);
  expectTypeOf(isWeekendDay).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(isWeekendDay).returns.toEqualTypeOf<boolean>();
});

test("問8 half", () => {
  expect(half(9)).toBe(4.5);
  expectTypeOf(half).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(half).returns.toEqualTypeOf<number>();
});

test("問9 negate", () => {
  expect(negate(3)).toBe(-3);
  expect(negate(-2)).toBe(2);
  expectTypeOf(negate).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(negate).returns.toEqualTypeOf<number>();
});

test("問10 quote", () => {
  expect(quote("abc")).toBe('"abc"');
  expectTypeOf(quote).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(quote).returns.toEqualTypeOf<string>();
});

test("問11 kmToMiles", () => {
  expect(kmToMiles(10)).toBe(6.22);
  expect(kmToMiles(0)).toBe(0);
  expectTypeOf(kmToMiles).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(kmToMiles).returns.toEqualTypeOf<number>();
});

test("問12 percentText", () => {
  expect(percentText(0.5)).toBe("50%");
  expect(percentText(0.123)).toBe("12%");
  expectTypeOf(percentText).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(percentText).returns.toEqualTypeOf<string>();
});

test("問13 isMultipleOf7", () => {
  expect(isMultipleOf7(21)).toBe(true);
  expect(isMultipleOf7(22)).toBe(false);
  expectTypeOf(isMultipleOf7).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(isMultipleOf7).returns.toEqualTypeOf<boolean>();
});

test("問14 lastWord", () => {
  expect(lastWord("hello big world")).toBe("world");
  expect(lastWord("single")).toBe("single");
  expectTypeOf(lastWord).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(lastWord).returns.toEqualTypeOf<string>();
});

test("問15 triple", () => {
  expect(triple(4)).toBe(12);
  expectTypeOf(triple).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(triple).returns.toEqualTypeOf<number>();
});

test("問16 isPositiveNumber", () => {
  expect(isPositiveNumber(1)).toBe(true);
  expect(isPositiveNumber(-1)).toBe(false);
  expectTypeOf(isPositiveNumber).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(isPositiveNumber).returns.toEqualTypeOf<boolean>();
});

test("問17 firstWord", () => {
  expect(firstWord("hello world")).toBe("hello");
  expect(firstWord("single")).toBe("single");
  expectTypeOf(firstWord).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(firstWord).returns.toEqualTypeOf<string>();
});

test("問18 countSpaces", () => {
  expect(countSpaces("a b c")).toBe(2);
  expect(countSpaces("abc")).toBe(0);
  expectTypeOf(countSpaces).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(countSpaces).returns.toEqualTypeOf<number>();
});

test("問19 average2", () => {
  expect(average2(3, 8)).toBe(5.5);
  expectTypeOf(average2).parameters.toEqualTypeOf<[number, number]>();
  expectTypeOf(average2).returns.toEqualTypeOf<number>();
});

test("問20 describeTemp", () => {
  expect(describeTemp(30)).toBe("夏日");
  expect(describeTemp(20)).toBe("普通");
  expectTypeOf(describeTemp).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(describeTemp).returns.toEqualTypeOf<"夏日" | "普通">();
});
