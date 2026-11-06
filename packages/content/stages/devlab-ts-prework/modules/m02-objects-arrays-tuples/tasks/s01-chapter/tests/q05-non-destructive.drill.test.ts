// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import {
  append,
  prepend,
  dropFirst,
  dropLast,
  insertAt,
  removeAt,
  replaceAt,
  sortAsc,
  sortDesc,
  sortWords,
  reversed,
  concatBoth,
  without,
  uniqueNumbers,
  moveToFront,
  swapItems,
  take,
  skip,
  filled,
  incrementAt,
} from "../src/q05-non-destructive.drill";

test("問1 append", () => {
  const items = ["a", "b"];
  expect(append(items, "c")).toEqual(["a", "b", "c"]);
  expect(items).toEqual(["a", "b"]);
  expectTypeOf(append).parameters.toEqualTypeOf<[readonly string[], string]>();
  expectTypeOf(append).returns.toEqualTypeOf<string[]>();
});

test("問2 prepend", () => {
  const items = ["b", "c"];
  expect(prepend(items, "a")).toEqual(["a", "b", "c"]);
  expect(items).toEqual(["b", "c"]);
  expectTypeOf(prepend).parameters.toEqualTypeOf<[readonly string[], string]>();
  expectTypeOf(prepend).returns.toEqualTypeOf<string[]>();
});

test("問3 dropFirst", () => {
  const items = ["a", "b", "c"];
  expect(dropFirst(items)).toEqual(["b", "c"]);
  expect(dropFirst([])).toEqual([]);
  expect(items).toEqual(["a", "b", "c"]);
  expectTypeOf(dropFirst).parameters.toEqualTypeOf<[readonly string[]]>();
  expectTypeOf(dropFirst).returns.toEqualTypeOf<string[]>();
});

test("問4 dropLast", () => {
  const items = ["a", "b", "c"];
  expect(dropLast(items)).toEqual(["a", "b"]);
  expect(items).toEqual(["a", "b", "c"]);
  expectTypeOf(dropLast).parameters.toEqualTypeOf<[readonly string[]]>();
  expectTypeOf(dropLast).returns.toEqualTypeOf<string[]>();
});

test("問5 insertAt", () => {
  const items = ["a", "c"];
  expect(insertAt(items, 1, "b")).toEqual(["a", "b", "c"]);
  expect(insertAt(items, 0, "z")).toEqual(["z", "a", "c"]);
  expect(items).toEqual(["a", "c"]);
  expectTypeOf(insertAt).parameters.toEqualTypeOf<[readonly string[], number, string]>();
  expectTypeOf(insertAt).returns.toEqualTypeOf<string[]>();
});

test("問6 removeAt", () => {
  const items = ["a", "b", "c"];
  expect(removeAt(items, 1)).toEqual(["a", "c"]);
  expect(items).toEqual(["a", "b", "c"]);
  expectTypeOf(removeAt).parameters.toEqualTypeOf<[readonly string[], number]>();
  expectTypeOf(removeAt).returns.toEqualTypeOf<string[]>();
});

test("問7 replaceAt", () => {
  const items = ["a", "b", "c"];
  expect(replaceAt(items, 1, "x")).toEqual(["a", "x", "c"]);
  expect(items).toEqual(["a", "b", "c"]);
  expectTypeOf(replaceAt).parameters.toEqualTypeOf<[readonly string[], number, string]>();
  expectTypeOf(replaceAt).returns.toEqualTypeOf<string[]>();
});

test("問8 sortAsc", () => {
  const numbers = [3, 1, 10, 2];
  expect(sortAsc(numbers)).toEqual([1, 2, 3, 10]);
  expect(numbers).toEqual([3, 1, 10, 2]);
  expectTypeOf(sortAsc).parameters.toEqualTypeOf<[readonly number[]]>();
  expectTypeOf(sortAsc).returns.toEqualTypeOf<number[]>();
});

test("問9 sortDesc", () => {
  const numbers = [3, 1, 10, 2];
  expect(sortDesc(numbers)).toEqual([10, 3, 2, 1]);
  expect(numbers).toEqual([3, 1, 10, 2]);
  expectTypeOf(sortDesc).parameters.toEqualTypeOf<[readonly number[]]>();
  expectTypeOf(sortDesc).returns.toEqualTypeOf<number[]>();
});

test("問10 sortWords", () => {
  const words = ["banana", "cherry", "apple"];
  expect(sortWords(words)).toEqual(["apple", "banana", "cherry"]);
  expect(words).toEqual(["banana", "cherry", "apple"]);
  expectTypeOf(sortWords).parameters.toEqualTypeOf<[readonly string[]]>();
  expectTypeOf(sortWords).returns.toEqualTypeOf<string[]>();
});

test("問11 reversed", () => {
  const items = ["a", "b", "c"];
  expect(reversed(items)).toEqual(["c", "b", "a"]);
  expect(items).toEqual(["a", "b", "c"]);
  expectTypeOf(reversed).parameters.toEqualTypeOf<[readonly string[]]>();
  expectTypeOf(reversed).returns.toEqualTypeOf<string[]>();
});

test("問12 concatBoth", () => {
  const a = [1, 2];
  expect(concatBoth(a, [3])).toEqual([1, 2, 3]);
  expect(a).toEqual([1, 2]);
  expectTypeOf(concatBoth).parameters.toEqualTypeOf<[readonly number[], readonly number[]]>();
  expectTypeOf(concatBoth).returns.toEqualTypeOf<number[]>();
});

test("問13 without", () => {
  const items = ["a", "b", "a"];
  expect(without(items, "a")).toEqual(["b"]);
  expect(items).toEqual(["a", "b", "a"]);
  expectTypeOf(without).parameters.toEqualTypeOf<[readonly string[], string]>();
  expectTypeOf(without).returns.toEqualTypeOf<string[]>();
});

test("問14 uniqueNumbers", () => {
  expect(uniqueNumbers([3, 1, 3, 2, 1])).toEqual([3, 1, 2]);
  expect(uniqueNumbers([])).toEqual([]);
  expectTypeOf(uniqueNumbers).parameters.toEqualTypeOf<[readonly number[]]>();
  expectTypeOf(uniqueNumbers).returns.toEqualTypeOf<number[]>();
});

test("問15 moveToFront", () => {
  const items = ["a", "b", "c"];
  expect(moveToFront(items, 2)).toEqual(["c", "a", "b"]);
  expect(moveToFront(items, 0)).toEqual(["a", "b", "c"]);
  expect(items).toEqual(["a", "b", "c"]);
  expectTypeOf(moveToFront).parameters.toEqualTypeOf<[readonly string[], number]>();
  expectTypeOf(moveToFront).returns.toEqualTypeOf<string[]>();
});

test("問16 swapItems", () => {
  const items = ["a", "b", "c"];
  expect(swapItems(items, 0, 2)).toEqual(["c", "b", "a"]);
  expect(items).toEqual(["a", "b", "c"]);
  expect(() => swapItems(items, 0, 3)).toThrow(Error);
  expectTypeOf(swapItems).parameters.toEqualTypeOf<[readonly string[], number, number]>();
  expectTypeOf(swapItems).returns.toEqualTypeOf<string[]>();
});

test("問17 take", () => {
  expect(take([1, 2, 3, 4], 2)).toEqual([1, 2]);
  expect(take([1], 5)).toEqual([1]);
  expectTypeOf(take).parameters.toEqualTypeOf<[readonly number[], number]>();
  expectTypeOf(take).returns.toEqualTypeOf<number[]>();
});

test("問18 skip", () => {
  expect(skip([1, 2, 3, 4], 2)).toEqual([3, 4]);
  expect(skip([1], 5)).toEqual([]);
  expectTypeOf(skip).parameters.toEqualTypeOf<[readonly number[], number]>();
  expectTypeOf(skip).returns.toEqualTypeOf<number[]>();
});

test("問19 filled", () => {
  expect(filled(3, 0)).toEqual([0, 0, 0]);
  expect(filled(0, 7)).toEqual([]);
  expectTypeOf(filled).parameters.toEqualTypeOf<[number, number]>();
  expectTypeOf(filled).returns.toEqualTypeOf<number[]>();
});

test("問20 incrementAt", () => {
  const numbers = [1, 1, 1];
  expect(incrementAt(numbers, 1)).toEqual([1, 2, 1]);
  expect(numbers).toEqual([1, 1, 1]);
  expectTypeOf(incrementAt).parameters.toEqualTypeOf<[readonly number[], number]>();
  expectTypeOf(incrementAt).returns.toEqualTypeOf<number[]>();
});
