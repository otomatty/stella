// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import {
  sumArray,
  countMatches,
  longestWord,
  indexOfMax,
  productOf,
  reverseArray,
  squaresUpTo,
  evensUpTo,
  joinWithDash,
  countUpper,
  positionsOf,
  digitTotal,
  firstNegative,
  allEven,
  runningTotal,
  zipSum,
  flatten,
  countInRange,
  dedupe,
  stairs,
} from "../src/q03-for-of.drill";

test("問1 sumArray", () => {
  expect(sumArray([1, 2, 3])).toBe(6);
  expect(sumArray([])).toBe(0);
  expectTypeOf(sumArray).parameters.toEqualTypeOf<[readonly number[]]>();
  expectTypeOf(sumArray).returns.toEqualTypeOf<number>();
});

test("問2 countMatches", () => {
  expect(countMatches(["a", "b", "a"], "a")).toBe(2);
  expect(countMatches([], "a")).toBe(0);
  expectTypeOf(countMatches).parameters.toEqualTypeOf<[readonly string[], string]>();
  expectTypeOf(countMatches).returns.toEqualTypeOf<number>();
});

test("問3 longestWord", () => {
  expect(longestWord(["a", "abc", "ab"])).toBe("abc");
  expect(longestWord(["ab", "cd"])).toBe("ab");
  expect(longestWord([])).toBe("");
  expectTypeOf(longestWord).parameters.toEqualTypeOf<[readonly string[]]>();
  expectTypeOf(longestWord).returns.toEqualTypeOf<string>();
});

test("問4 indexOfMax", () => {
  expect(indexOfMax([3, 9, 2])).toBe(1);
  expect(indexOfMax([5, 5])).toBe(0);
  expect(indexOfMax([])).toBe(-1);
  expectTypeOf(indexOfMax).parameters.toEqualTypeOf<[readonly number[]]>();
  expectTypeOf(indexOfMax).returns.toEqualTypeOf<number>();
});

test("問5 productOf", () => {
  expect(productOf([2, 3, 4])).toBe(24);
  expect(productOf([])).toBe(1);
  expectTypeOf(productOf).parameters.toEqualTypeOf<[readonly number[]]>();
  expectTypeOf(productOf).returns.toEqualTypeOf<number>();
});

test("問6 reverseArray", () => {
  expect(reverseArray(["a", "b", "c"])).toEqual(["c", "b", "a"]);
  expect(reverseArray([])).toEqual([]);
  expectTypeOf(reverseArray).parameters.toEqualTypeOf<[readonly string[]]>();
  expectTypeOf(reverseArray).returns.toEqualTypeOf<string[]>();
});

test("問7 squaresUpTo", () => {
  expect(squaresUpTo(4)).toEqual([1, 4, 9, 16]);
  expect(squaresUpTo(0)).toEqual([]);
  expectTypeOf(squaresUpTo).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(squaresUpTo).returns.toEqualTypeOf<number[]>();
});

test("問8 evensUpTo", () => {
  expect(evensUpTo(7)).toEqual([0, 2, 4, 6]);
  expect(evensUpTo(0)).toEqual([0]);
  expectTypeOf(evensUpTo).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(evensUpTo).returns.toEqualTypeOf<number[]>();
});

test("問9 joinWithDash", () => {
  expect(joinWithDash(["a", "b", "c"])).toBe("a-b-c");
  expect(joinWithDash(["a"])).toBe("a");
  expect(joinWithDash([])).toBe("");
  expectTypeOf(joinWithDash).parameters.toEqualTypeOf<[readonly string[]]>();
  expectTypeOf(joinWithDash).returns.toEqualTypeOf<string>();
});

test("問10 countUpper", () => {
  expect(countUpper("TypeScript")).toBe(2);
  expect(countUpper("abc")).toBe(0);
  expectTypeOf(countUpper).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(countUpper).returns.toEqualTypeOf<number>();
});

test("問11 positionsOf", () => {
  expect(positionsOf("banana", "a")).toEqual([1, 3, 5]);
  expect(positionsOf("banana", "z")).toEqual([]);
  expectTypeOf(positionsOf).parameters.toEqualTypeOf<[string, string]>();
  expectTypeOf(positionsOf).returns.toEqualTypeOf<number[]>();
});

test("問12 digitTotal", () => {
  expect(digitTotal("a1b2c3")).toBe(6);
  expect(digitTotal("abc")).toBe(0);
  expectTypeOf(digitTotal).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(digitTotal).returns.toEqualTypeOf<number>();
});

test("問13 firstNegative", () => {
  expect(firstNegative([3, -1, -5])).toBe(-1);
  expect(firstNegative([1, 2])).toBeUndefined();
  expectTypeOf(firstNegative).parameters.toEqualTypeOf<[readonly number[]]>();
  expectTypeOf(firstNegative).returns.toEqualTypeOf<number | undefined>();
});

test("問14 allEven", () => {
  expect(allEven([2, 4, 6])).toBe(true);
  expect(allEven([2, 4, 5])).toBe(false);
  expect(allEven([])).toBe(true);
  expectTypeOf(allEven).parameters.toEqualTypeOf<[readonly number[]]>();
  expectTypeOf(allEven).returns.toEqualTypeOf<boolean>();
});

test("問15 runningTotal", () => {
  expect(runningTotal([1, 2, 3])).toEqual([1, 3, 6]);
  expect(runningTotal([])).toEqual([]);
  expectTypeOf(runningTotal).parameters.toEqualTypeOf<[readonly number[]]>();
  expectTypeOf(runningTotal).returns.toEqualTypeOf<number[]>();
});

test("問16 zipSum", () => {
  expect(zipSum([1, 2, 3], [10, 20])).toEqual([11, 22]);
  expect(zipSum([], [1])).toEqual([]);
  expectTypeOf(zipSum).parameters.toEqualTypeOf<[readonly number[], readonly number[]]>();
  expectTypeOf(zipSum).returns.toEqualTypeOf<number[]>();
});

test("問17 flatten", () => {
  expect(flatten([[1, 2], [3], []])).toEqual([1, 2, 3]);
  expect(flatten([])).toEqual([]);
  expectTypeOf(flatten).parameters.toEqualTypeOf<[readonly (readonly number[])[]]>();
  expectTypeOf(flatten).returns.toEqualTypeOf<number[]>();
});

test("問18 countInRange", () => {
  expect(countInRange([1, 5, 10, 15], 5, 10)).toBe(2);
  expect(countInRange([], 0, 1)).toBe(0);
  expectTypeOf(countInRange).parameters.toEqualTypeOf<[readonly number[], number, number]>();
  expectTypeOf(countInRange).returns.toEqualTypeOf<number>();
});

test("問19 dedupe", () => {
  expect(dedupe(["a", "b", "a", "c", "b"])).toEqual(["a", "b", "c"]);
  expect(dedupe([])).toEqual([]);
  expectTypeOf(dedupe).parameters.toEqualTypeOf<[readonly string[]]>();
  expectTypeOf(dedupe).returns.toEqualTypeOf<string[]>();
});

test("問20 stairs", () => {
  expect(stairs(3)).toEqual(["*", "**", "***"]);
  expect(stairs(0)).toEqual([]);
  expectTypeOf(stairs).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(stairs).returns.toEqualTypeOf<string[]>();
});
