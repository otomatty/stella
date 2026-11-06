// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import {
  identity,
  firstOf,
  lastOf,
  wrapInArray,
  repeatValue,
  makePair,
  swapPair,
  type Box,
  boxOf,
  unboxed,
  reversedCopy,
  nth,
  takeFirst,
  countOf,
  includesValue,
  withoutValue,
  lastIndexOfValue,
  filledWith,
  type Maybe,
  orElse,
  zip,
  toggleItem,
} from "../src/q06-type-variables.drill";

test("問1 identity", () => {
  const nums: number[] = [1, 2];
  expect(identity(nums)).toBe(nums);
  expectTypeOf(identity(nums)).toEqualTypeOf<number[]>();
  expectTypeOf(identity(nums.join(""))).toEqualTypeOf<string>();
});

test("問2 firstOf", () => {
  const nums: number[] = [3, 1];
  const words: string[] = ["a"];
  expect(firstOf(nums)).toBe(3);
  expectTypeOf(firstOf(nums)).toEqualTypeOf<number | undefined>();
  expectTypeOf(firstOf(words)).toEqualTypeOf<string | undefined>();
});

test("問3 lastOf", () => {
  const words: string[] = ["a", "b"];
  const empty: number[] = [];
  expect(lastOf(words)).toBe("b");
  expect(lastOf(empty)).toBeUndefined();
  expectTypeOf(lastOf(words)).toEqualTypeOf<string | undefined>();
  expectTypeOf(lastOf(empty)).toEqualTypeOf<number | undefined>();
});

test("問4 wrapInArray", () => {
  const nums: number[] = [7];
  expect(wrapInArray("a")).toEqual(["a"]);
  expectTypeOf(wrapInArray(nums.length)).toEqualTypeOf<number[]>();
  expectTypeOf(wrapInArray(nums)).toEqualTypeOf<number[][]>();
});

test("問5 repeatValue", () => {
  const words: string[] = ["x"];
  expect(repeatValue("x", 3)).toEqual(["x", "x", "x"]);
  expectTypeOf(repeatValue(words.join(""), 2)).toEqualTypeOf<string[]>();
});

test("問6 makePair", () => {
  const nums: number[] = [1];
  const text = nums.join("");
  expect(makePair("a", 1)).toEqual(["a", 1]);
  expectTypeOf(makePair(text, nums.length)).toEqualTypeOf<[string, number]>();
});

test("問7 swapPair", () => {
  const pair: [string, number] = ["a", 1];
  expect(swapPair(pair)).toEqual([1, "a"]);
  expectTypeOf(swapPair(pair)).toEqualTypeOf<[number, string]>();
});

test("問8 boxOf", () => {
  const words: string[] = ["a"];
  expect(boxOf(5)).toEqual({ value: 5 });
  expectTypeOf<Box<number>>().toEqualTypeOf<{ value: number }>();
  expectTypeOf(boxOf(words)).toEqualTypeOf<Box<string[]>>();
});

test("問9 unboxed", () => {
  const box: { value: number[] } = { value: [1] };
  expect(unboxed({ value: "a" })).toBe("a");
  expectTypeOf(unboxed(box)).toEqualTypeOf<number[]>();
});

test("問10 reversedCopy", () => {
  const nums: number[] = [1, 2, 3];
  expect(reversedCopy(nums)).toEqual([3, 2, 1]);
  expect(nums).toEqual([1, 2, 3]);
  expectTypeOf(reversedCopy(nums)).toEqualTypeOf<number[]>();
});

test("問11 nth", () => {
  const words: string[] = ["a", "b", "c"];
  expect(nth(words, 0)).toBe("a");
  expect(nth(words, -1)).toBe("c");
  expect(nth(words, 5)).toBeUndefined();
  expectTypeOf(nth(words, 0)).toEqualTypeOf<string | undefined>();
});

test("問12 takeFirst", () => {
  const nums: number[] = [1, 2, 3];
  expect(takeFirst(nums, 2)).toEqual([1, 2]);
  expectTypeOf(takeFirst(nums, 2)).toEqualTypeOf<number[]>();
});

test("問13 countOf", () => {
  const words: string[] = ["a", "b", "a"];
  expect(countOf(words, "a")).toBe(2);
  expect(countOf([1, 2, 1], 1)).toBe(2);
  const call = () => {
    // @ts-expect-error 文字列の配列に数値は探せない
    countOf(words, 1);
  };
  expect(typeof call).toBe("function");
});

test("問14 includesValue", () => {
  expect(includesValue([1, 2], 2)).toBe(true);
  expect(includesValue(["a"], "b")).toBe(false);
  const call = () => {
    // @ts-expect-error 数値の配列から文字列は探せない
    includesValue([1, 2], "2");
  };
  expect(typeof call).toBe("function");
});

test("問15 withoutValue", () => {
  const nums: number[] = [1, 2, 1];
  expect(withoutValue(nums, 1)).toEqual([2]);
  expectTypeOf(withoutValue(nums, 1)).toEqualTypeOf<number[]>();
});

test("問16 lastIndexOfValue", () => {
  expect(lastIndexOfValue(["a", "b", "a"], "a")).toBe(2);
  expect(lastIndexOfValue([1], 2)).toBe(-1);
  const call = () => {
    // @ts-expect-error 文字列の配列から数値は探せない
    lastIndexOfValue(["a"], 1);
  };
  expect(typeof call).toBe("function");
});

test("問17 filledWith", () => {
  const words: string[] = ["x"];
  expect(filledWith(3, 0)).toEqual([0, 0, 0]);
  expectTypeOf(filledWith(2, words)).toEqualTypeOf<string[][]>();
});

test("問18 orElse", () => {
  const nums: number[] = [1];
  const maybe: Maybe<number> = null;
  expect(orElse(maybe, 5)).toBe(5);
  expect(orElse("a", "b")).toBe("a");
  expectTypeOf<Maybe<string>>().toEqualTypeOf<string | null>();
  expectTypeOf(orElse(maybe, nums.length)).toEqualTypeOf<number>();
});

test("問19 zip", () => {
  const nums: number[] = [1, 2];
  const words: string[] = ["a", "b", "c"];
  expect(zip(nums, words)).toEqual([
    [1, "a"],
    [2, "b"],
  ]);
  expectTypeOf(zip(nums, words)).toEqualTypeOf<[number, string][]>();
});

test("問20 toggleItem", () => {
  const words: string[] = ["a", "b"];
  expect(toggleItem(words, "a")).toEqual(["b"]);
  expect(toggleItem(words, "c")).toEqual(["a", "b", "c"]);
  expectTypeOf(toggleItem(words, "a")).toEqualTypeOf<string[]>();
});
