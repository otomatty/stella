// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import {
  sumAll,
  countItems,
  firstOrZero,
  lastItem,
  doubleEach,
  lengths,
  evens,
  longWords,
  containsItem,
  positionOf,
  joinWithComma,
  maxValue,
  minValue,
  averageOf,
  upperAll,
  countPositive,
  range,
  repeatItem,
  sumEvenIndex,
  allPositive,
} from "../src/q04-array-type.drill";

test("問1 sumAll", () => {
  expect(sumAll([1, 2, 3])).toBe(6);
  expect(sumAll([])).toBe(0);
  expectTypeOf(sumAll).parameters.toEqualTypeOf<[readonly number[]]>();
  expectTypeOf(sumAll).returns.toEqualTypeOf<number>();
});

test("問2 countItems", () => {
  expect(countItems(["a", "b"])).toBe(2);
  expect(countItems([])).toBe(0);
  expectTypeOf(countItems).parameters.toEqualTypeOf<[readonly string[]]>();
  expectTypeOf(countItems).returns.toEqualTypeOf<number>();
});

test("問3 firstOrZero", () => {
  expect(firstOrZero([5, 6])).toBe(5);
  expect(firstOrZero([])).toBe(0);
  expectTypeOf(firstOrZero).parameters.toEqualTypeOf<[readonly number[]]>();
  expectTypeOf(firstOrZero).returns.toEqualTypeOf<number>();
});

test("問4 lastItem", () => {
  expect(lastItem(["a", "b", "c"])).toBe("c");
  expect(lastItem([])).toBeUndefined();
  expectTypeOf(lastItem).parameters.toEqualTypeOf<[readonly string[]]>();
  expectTypeOf(lastItem).returns.toEqualTypeOf<string | undefined>();
});

test("問5 doubleEach", () => {
  expect(doubleEach([1, 2, 3])).toEqual([2, 4, 6]);
  expectTypeOf(doubleEach).parameters.toEqualTypeOf<[readonly number[]]>();
  expectTypeOf(doubleEach).returns.toEqualTypeOf<number[]>();
});

test("問6 lengths", () => {
  expect(lengths(["a", "bcd"])).toEqual([1, 3]);
  expect(lengths([])).toEqual([]);
  expectTypeOf(lengths).parameters.toEqualTypeOf<[readonly string[]]>();
  expectTypeOf(lengths).returns.toEqualTypeOf<number[]>();
});

test("問7 evens", () => {
  expect(evens([1, 2, 3, 4])).toEqual([2, 4]);
  expectTypeOf(evens).parameters.toEqualTypeOf<[readonly number[]]>();
  expectTypeOf(evens).returns.toEqualTypeOf<number[]>();
});

test("問8 longWords", () => {
  expect(longWords(["a", "abc", "abcd"], 3)).toEqual(["abc", "abcd"]);
  expectTypeOf(longWords).parameters.toEqualTypeOf<[readonly string[], number]>();
  expectTypeOf(longWords).returns.toEqualTypeOf<string[]>();
});

test("問9 containsItem", () => {
  expect(containsItem(["a", "b"], "b")).toBe(true);
  expect(containsItem(["a", "b"], "c")).toBe(false);
  expectTypeOf(containsItem).parameters.toEqualTypeOf<[readonly string[], string]>();
  expectTypeOf(containsItem).returns.toEqualTypeOf<boolean>();
});

test("問10 positionOf", () => {
  expect(positionOf(["a", "b"], "b")).toBe(1);
  expect(positionOf(["a", "b"], "c")).toBe(-1);
  expectTypeOf(positionOf).parameters.toEqualTypeOf<[readonly string[], string]>();
  expectTypeOf(positionOf).returns.toEqualTypeOf<number>();
});

test("問11 joinWithComma", () => {
  expect(joinWithComma(["a", "b", "c"])).toBe("a, b, c");
  expect(joinWithComma([])).toBe("");
  expectTypeOf(joinWithComma).parameters.toEqualTypeOf<[readonly string[]]>();
  expectTypeOf(joinWithComma).returns.toEqualTypeOf<string>();
});

test("問12 maxValue", () => {
  expect(maxValue([3, 9, 2])).toBe(9);
  expect(() => maxValue([])).toThrow(Error);
  expectTypeOf(maxValue).parameters.toEqualTypeOf<[readonly number[]]>();
  expectTypeOf(maxValue).returns.toEqualTypeOf<number>();
});

test("問13 minValue", () => {
  expect(minValue([3, 9, 2])).toBe(2);
  expect(() => minValue([])).toThrow(Error);
  expectTypeOf(minValue).parameters.toEqualTypeOf<[readonly number[]]>();
  expectTypeOf(minValue).returns.toEqualTypeOf<number>();
});

test("問14 averageOf", () => {
  expect(averageOf([2, 4, 9])).toBe(5);
  expect(averageOf([])).toBe(0);
  expectTypeOf(averageOf).parameters.toEqualTypeOf<[readonly number[]]>();
  expectTypeOf(averageOf).returns.toEqualTypeOf<number>();
});

test("問15 upperAll", () => {
  expect(upperAll(["a", "Bc"])).toEqual(["A", "BC"]);
  expectTypeOf(upperAll).parameters.toEqualTypeOf<[readonly string[]]>();
  expectTypeOf(upperAll).returns.toEqualTypeOf<string[]>();
});

test("問16 countPositive", () => {
  expect(countPositive([3, -1, 0, 5])).toBe(2);
  expect(countPositive([])).toBe(0);
  expectTypeOf(countPositive).parameters.toEqualTypeOf<[readonly number[]]>();
  expectTypeOf(countPositive).returns.toEqualTypeOf<number>();
});

test("問17 range", () => {
  expect(range(2, 5)).toEqual([2, 3, 4]);
  expect(range(3, 3)).toEqual([]);
  expectTypeOf(range).parameters.toEqualTypeOf<[number, number]>();
  expectTypeOf(range).returns.toEqualTypeOf<number[]>();
});

test("問18 repeatItem", () => {
  expect(repeatItem("x", 3)).toEqual(["x", "x", "x"]);
  expect(repeatItem("x", 0)).toEqual([]);
  expectTypeOf(repeatItem).parameters.toEqualTypeOf<[string, number]>();
  expectTypeOf(repeatItem).returns.toEqualTypeOf<string[]>();
});

test("問19 sumEvenIndex", () => {
  expect(sumEvenIndex([1, 2, 3, 4, 5])).toBe(9);
  expect(sumEvenIndex([])).toBe(0);
  expectTypeOf(sumEvenIndex).parameters.toEqualTypeOf<[readonly number[]]>();
  expectTypeOf(sumEvenIndex).returns.toEqualTypeOf<number>();
});

test("問20 allPositive", () => {
  expect(allPositive([1, 2, 3])).toBe(true);
  expect(allPositive([1, 0, 3])).toBe(false);
  expectTypeOf(allPositive).parameters.toEqualTypeOf<[readonly number[]]>();
  expectTypeOf(allPositive).returns.toEqualTypeOf<boolean>();
});
