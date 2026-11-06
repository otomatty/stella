// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import {
  total,
  largest,
  smallest,
  concatAll,
  countArgs,
  joinWords,
  averageAll,
  allTrue,
  anyTrue,
  pathOf,
  multiplyAll,
  firstDefined,
  labeled,
  longestOf,
  countOf,
  pushAll,
  maxOfArray,
  mergeArrays,
  withPrefix,
  uniqueOf,
} from "../src/q05-rest-params.drill";

test("問1 total", () => {
  expect(total(1, 2, 3)).toBe(6);
  expect(total()).toBe(0);
  expectTypeOf(total).parameters.toEqualTypeOf<number[]>();
  expectTypeOf(total).returns.toEqualTypeOf<number>();
});

test("問2 largest", () => {
  expect(largest(3, 9, 2)).toBe(9);
  expect(largest(-1)).toBe(-1);
  expectTypeOf(largest).parameters.toEqualTypeOf<[number, ...number[]]>();
  expectTypeOf(largest).returns.toEqualTypeOf<number>();
});

test("問3 smallest", () => {
  expect(smallest(3, 9, 2)).toBe(2);
  expect(smallest(7)).toBe(7);
  expectTypeOf(smallest).parameters.toEqualTypeOf<[number, ...number[]]>();
  expectTypeOf(smallest).returns.toEqualTypeOf<number>();
});

test("問4 concatAll", () => {
  expect(concatAll("a", "b", "c")).toBe("abc");
  expect(concatAll()).toBe("");
  expectTypeOf(concatAll).parameters.toEqualTypeOf<string[]>();
  expectTypeOf(concatAll).returns.toEqualTypeOf<string>();
});

test("問5 countArgs", () => {
  expect(countArgs(1, "a", null)).toBe(3);
  expect(countArgs()).toBe(0);
  expectTypeOf(countArgs).parameters.toEqualTypeOf<unknown[]>();
  expectTypeOf(countArgs).returns.toEqualTypeOf<number>();
});

test("問6 joinWords", () => {
  expect(joinWords("-", "a", "b", "c")).toBe("a-b-c");
  expect(joinWords("-")).toBe("");
  expectTypeOf(joinWords).parameters.toEqualTypeOf<[string, ...string[]]>();
  expectTypeOf(joinWords).returns.toEqualTypeOf<string>();
});

test("問7 averageAll", () => {
  expect(averageAll(2, 4, 9)).toBe(5);
  expect(averageAll()).toBe(0);
  expectTypeOf(averageAll).parameters.toEqualTypeOf<number[]>();
  expectTypeOf(averageAll).returns.toEqualTypeOf<number>();
});

test("問8 allTrue", () => {
  expect(allTrue(true, true)).toBe(true);
  expect(allTrue(true, false)).toBe(false);
  expect(allTrue()).toBe(true);
  expectTypeOf(allTrue).parameters.toEqualTypeOf<boolean[]>();
  expectTypeOf(allTrue).returns.toEqualTypeOf<boolean>();
});

test("問9 anyTrue", () => {
  expect(anyTrue(false, true)).toBe(true);
  expect(anyTrue(false)).toBe(false);
  expect(anyTrue()).toBe(false);
  expectTypeOf(anyTrue).parameters.toEqualTypeOf<boolean[]>();
  expectTypeOf(anyTrue).returns.toEqualTypeOf<boolean>();
});

test("問10 pathOf", () => {
  expect(pathOf("users", "", "42")).toBe("users/42");
  expect(pathOf()).toBe("");
  expectTypeOf(pathOf).parameters.toEqualTypeOf<string[]>();
  expectTypeOf(pathOf).returns.toEqualTypeOf<string>();
});

test("問11 multiplyAll", () => {
  expect(multiplyAll(2, 3, 4)).toBe(24);
  expect(multiplyAll()).toBe(1);
  expectTypeOf(multiplyAll).parameters.toEqualTypeOf<number[]>();
  expectTypeOf(multiplyAll).returns.toEqualTypeOf<number>();
});

test("問12 firstDefined", () => {
  expect(firstDefined(undefined, "a", "b")).toBe("a");
  expect(firstDefined(undefined)).toBeUndefined();
  expectTypeOf(firstDefined).parameters.toEqualTypeOf<(string | undefined)[]>();
  expectTypeOf(firstDefined).returns.toEqualTypeOf<string | undefined>();
});

test("問13 labeled", () => {
  expect(labeled("todo", "買い物", "掃除")).toBe("[todo] 買い物, 掃除");
  expect(labeled("todo")).toBe("[todo]");
  expectTypeOf(labeled).parameters.toEqualTypeOf<[string, ...string[]]>();
  expectTypeOf(labeled).returns.toEqualTypeOf<string>();
});

test("問14 longestOf", () => {
  expect(longestOf("a", "abc", "ab")).toBe("abc");
  expect(longestOf()).toBe("");
  expectTypeOf(longestOf).parameters.toEqualTypeOf<string[]>();
  expectTypeOf(longestOf).returns.toEqualTypeOf<string>();
});

test("問15 countOf", () => {
  expect(countOf("a", "a", "b", "a")).toBe(2);
  expect(countOf("a")).toBe(0);
  expectTypeOf(countOf).parameters.toEqualTypeOf<[string, ...string[]]>();
  expectTypeOf(countOf).returns.toEqualTypeOf<number>();
});

test("問16 pushAll", () => {
  const target = [0];
  expect(pushAll(target, 1, 2)).toBe(3);
  expect(target).toEqual([0, 1, 2]);
  expectTypeOf(pushAll).parameters.toEqualTypeOf<[number[], ...number[]]>();
  expectTypeOf(pushAll).returns.toEqualTypeOf<number>();
});

test("問17 maxOfArray", () => {
  expect(maxOfArray([3, 9, 2])).toBe(9);
  expect(() => maxOfArray([])).toThrow(Error);
  expectTypeOf(maxOfArray).parameters.toEqualTypeOf<[readonly number[]]>();
  expectTypeOf(maxOfArray).returns.toEqualTypeOf<number>();
});

test("問18 mergeArrays", () => {
  expect(mergeArrays([1, 2], [3], [])).toEqual([1, 2, 3]);
  expect(mergeArrays()).toEqual([]);
  expectTypeOf(mergeArrays).parameters.toEqualTypeOf<(readonly number[])[]>();
  expectTypeOf(mergeArrays).returns.toEqualTypeOf<number[]>();
});

test("問19 withPrefix", () => {
  expect(withPrefix("#", "a", "b")).toEqual(["#a", "#b"]);
  expect(withPrefix("#")).toEqual([]);
  expectTypeOf(withPrefix).parameters.toEqualTypeOf<[string, ...string[]]>();
  expectTypeOf(withPrefix).returns.toEqualTypeOf<string[]>();
});

test("問20 uniqueOf", () => {
  expect(uniqueOf("a", "b", "a")).toEqual(["a", "b"]);
  expect(uniqueOf()).toEqual([]);
  expectTypeOf(uniqueOf).parameters.toEqualTypeOf<string[]>();
  expectTypeOf(uniqueOf).returns.toEqualTypeOf<string[]>();
});
