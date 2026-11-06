// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import {
  groupItems,
  countItems,
  splitBy,
  uniqueByKey,
  sortByKey,
  chunked,
  zipWith,
  flattenOnce,
  compact,
  indexBy,
  mapValues,
  lastN,
  difference,
  intersection,
  union,
  takeWhile,
  dropWhile,
  findLastItem,
  sumOf,
  minBy,
} from "../src/q08-generic-utils.drill";

test("問1 groupItems", () => {
  const words: string[] = ["ab", "c", "de"];
  expect(groupItems(words, (s) => String(s.length))).toEqual({ "2": ["ab", "de"], "1": ["c"] });
  expectTypeOf(groupItems(words, (s) => s)).toEqualTypeOf<Record<string, string[]>>();
});

test("問2 countItems", () => {
  expect(countItems([1, 2, 3], (n) => (n % 2 === 0 ? "偶数" : "奇数"))).toEqual({
    奇数: 2,
    偶数: 1,
  });
});

test("問3 splitBy", () => {
  const nums: number[] = [1, 2, 3];
  expect(splitBy(nums, (n) => n > 1)).toEqual([[2, 3], [1]]);
  expectTypeOf(splitBy(nums, (n) => n > 1)).toEqualTypeOf<[number[], number[]]>();
});

test("問4 uniqueByKey", () => {
  const words: string[] = ["ab", "cd", "e"];
  expect(uniqueByKey(words, (s) => s.length)).toEqual(["ab", "e"]);
  expectTypeOf(uniqueByKey(words, (s) => s)).toEqualTypeOf<string[]>();
});

test("問5 sortByKey", () => {
  expect(sortByKey([{ n: 2 }, { n: 1 }], (x) => x.n)).toEqual([{ n: 1 }, { n: 2 }]);
});

test("問6 chunked", () => {
  const words: string[] = ["a", "b", "c"];
  expect(chunked(words, 2)).toEqual([["a", "b"], ["c"]]);
  expect(() => chunked(words, 0)).toThrow(Error);
  expectTypeOf(chunked(words, 2)).toEqualTypeOf<string[][]>();
});

test("問7 zipWith", () => {
  const nums: number[] = [1, 2, 3];
  const words: string[] = ["a", "b"];
  expect(zipWith(nums, words, (n, s) => `${s}${n}`)).toEqual(["a1", "b2"]);
  expectTypeOf(zipWith(nums, words, (n, s) => s.length > n)).toEqualTypeOf<boolean[]>();
});

test("問8 flattenOnce", () => {
  const nested: string[][] = [["a"], ["b", "c"]];
  expect(flattenOnce(nested)).toEqual(["a", "b", "c"]);
  expectTypeOf(flattenOnce(nested)).toEqualTypeOf<string[]>();
});

test("問9 compact", () => {
  const values: (number | null | undefined)[] = [1, null, 2, undefined, 0];
  expect(compact(values)).toEqual([1, 2, 0]);
  expectTypeOf(compact(values)).toEqualTypeOf<number[]>();
});

test("問10 indexBy", () => {
  const rows = [
    { code: "A", n: 1 },
    { code: "B", n: 2 },
    { code: "A", n: 3 },
  ];
  expect(indexBy(rows, (x) => x.code)).toEqual({ A: { code: "A", n: 3 }, B: { code: "B", n: 2 } });
  expectTypeOf(indexBy(rows, (x) => x.code)).toEqualTypeOf<
    Record<string, { code: string; n: number }>
  >();
});

test("問11 mapValues", () => {
  const record: Record<string, number> = { a: 1, b: 2 };
  expect(mapValues(record, (n) => String(n))).toEqual({ a: "1", b: "2" });
  expectTypeOf(mapValues(record, (n) => n > 1)).toEqualTypeOf<Record<string, boolean>>();
});

test("問12 lastN", () => {
  const nums: number[] = [1, 2, 3];
  expect(lastN(nums, 2)).toEqual([2, 3]);
  expect(lastN(nums, 0)).toEqual([]);
  expect(lastN(nums, 5)).toEqual([1, 2, 3]);
  expectTypeOf(lastN(nums, 1)).toEqualTypeOf<number[]>();
});

test("問13 difference", () => {
  expect(difference([1, 2, 3], [2])).toEqual([1, 3]);
  expect(difference(["a"], ["a"])).toEqual([]);
});

test("問14 intersection", () => {
  expect(intersection([1, 2, 2, 3], [2, 3, 4])).toEqual([2, 3]);
  expect(intersection(["a"], ["b"])).toEqual([]);
});

test("問15 union", () => {
  expect(union([1, 2], [2, 3])).toEqual([1, 2, 3]);
  expect(union(["a", "a"], [])).toEqual(["a"]);
});

test("問16 takeWhile", () => {
  expect(takeWhile([1, 2, 5, 1], (n) => n < 3)).toEqual([1, 2]);
  expect(takeWhile(["a"], () => false)).toEqual([]);
});

test("問17 dropWhile", () => {
  expect(dropWhile([1, 2, 5, 1], (n) => n < 3)).toEqual([5, 1]);
  expect(dropWhile(["a"], () => true)).toEqual([]);
});

test("問18 findLastItem", () => {
  const nums: number[] = [1, 4, 6, 7];
  expect(findLastItem(nums, (n) => n % 2 === 0)).toBe(6);
  expect(findLastItem(nums, (n) => n > 10)).toBeUndefined();
  expectTypeOf(findLastItem(nums, (n) => n > 0)).toEqualTypeOf<number | undefined>();
});

test("問19 sumOf", () => {
  expect(sumOf([{ p: 100 }, { p: 50 }], (x) => x.p)).toBe(150);
  expect(sumOf([], () => 1)).toBe(0);
});

test("問20 minBy", () => {
  const words: string[] = ["abc", "a", "b"];
  expect(minBy(words, (s) => s.length)).toBe("a");
  expectTypeOf(minBy(words, (s) => s.length)).toEqualTypeOf<string | undefined>();
});
