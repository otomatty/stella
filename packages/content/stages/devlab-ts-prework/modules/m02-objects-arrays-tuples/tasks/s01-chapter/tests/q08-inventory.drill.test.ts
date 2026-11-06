// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import {
  scoreOf,
  hasKey,
  setScore,
  keyCount,
  sumValues,
  increment,
  countWords,
  countChars,
  keysOf,
  topKey,
  invert,
  pickKeys,
  removeKey,
  mergeCounts,
  groupByLength,
  priceOf,
  orderTotal,
  filterAtLeast,
  entriesText,
  lookupOr,
} from "../src/q08-inventory.drill";

test("問1 scoreOf", () => {
  expect(scoreOf({ 山田: 80, 佐藤: 70 }, "山田")).toBe(80);
  expect(scoreOf({ 山田: 80 }, "鈴木")).toBe(0);
  expectTypeOf(scoreOf).parameters.toEqualTypeOf<[{ [name: string]: number }, string]>();
  expectTypeOf(scoreOf).returns.toEqualTypeOf<number>();
});

test("問2 hasKey", () => {
  expect(hasKey({ a: "x" }, "a")).toBe(true);
  expect(hasKey({ a: "x" }, "b")).toBe(false);
  expectTypeOf(hasKey).parameters.toEqualTypeOf<[{ [key: string]: string }, string]>();
  expectTypeOf(hasKey).returns.toEqualTypeOf<boolean>();
});

test("問3 setScore", () => {
  const scores = { 山田: 80 };
  expect(setScore(scores, "佐藤", 70)).toEqual({ 山田: 80, 佐藤: 70 });
  expect(setScore(scores, "山田", 90)).toEqual({ 山田: 90 });
  expect(scores).toEqual({ 山田: 80 });
  expectTypeOf(setScore).parameters.toEqualTypeOf<[{ [name: string]: number }, string, number]>();
  expectTypeOf(setScore).returns.toEqualTypeOf<{ [name: string]: number }>();
});

test("問4 keyCount", () => {
  expect(keyCount({ a: 1, b: 2 })).toBe(2);
  expect(keyCount({})).toBe(0);
  expectTypeOf(keyCount).parameters.toEqualTypeOf<[{ [key: string]: number }]>();
  expectTypeOf(keyCount).returns.toEqualTypeOf<number>();
});

test("問5 sumValues", () => {
  expect(sumValues({ a: 1, b: 2 })).toBe(3);
  expect(sumValues({})).toBe(0);
  expectTypeOf(sumValues).parameters.toEqualTypeOf<[{ [key: string]: number }]>();
  expectTypeOf(sumValues).returns.toEqualTypeOf<number>();
});

test("問6 increment", () => {
  const counts = { a: 1 };
  expect(increment(counts, "a")).toEqual({ a: 2 });
  expect(increment(counts, "b")).toEqual({ a: 1, b: 1 });
  expect(counts).toEqual({ a: 1 });
  expectTypeOf(increment).parameters.toEqualTypeOf<[{ [key: string]: number }, string]>();
  expectTypeOf(increment).returns.toEqualTypeOf<{ [key: string]: number }>();
});

test("問7 countWords", () => {
  expect(countWords(["a", "b", "a"])).toEqual({ a: 2, b: 1 });
  expect(countWords([])).toEqual({});
  expectTypeOf(countWords).parameters.toEqualTypeOf<[readonly string[]]>();
  expectTypeOf(countWords).returns.toEqualTypeOf<{ [word: string]: number }>();
});

test("問8 countChars", () => {
  expect(countChars("banana")).toEqual({ b: 1, a: 3, n: 2 });
  expect(countChars("")).toEqual({});
  expectTypeOf(countChars).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(countChars).returns.toEqualTypeOf<{ [char: string]: number }>();
});

test("問9 keysOf", () => {
  expect(keysOf({ a: 1, b: 2 })).toEqual(["a", "b"]);
  expectTypeOf(keysOf).parameters.toEqualTypeOf<[{ [key: string]: number }]>();
  expectTypeOf(keysOf).returns.toEqualTypeOf<string[]>();
});

test("問10 topKey", () => {
  expect(topKey({ a: 1, b: 3, c: 2 })).toBe("b");
  expect(topKey({ a: 3, b: 3 })).toBe("a");
  expect(topKey({})).toBeUndefined();
  expectTypeOf(topKey).parameters.toEqualTypeOf<[{ [key: string]: number }]>();
  expectTypeOf(topKey).returns.toEqualTypeOf<string | undefined>();
});

test("問11 invert", () => {
  expect(invert({ a: "x", b: "y" })).toEqual({ x: "a", y: "b" });
  expectTypeOf(invert).parameters.toEqualTypeOf<[{ [key: string]: string }]>();
  expectTypeOf(invert).returns.toEqualTypeOf<{ [value: string]: string }>();
});

test("問12 pickKeys", () => {
  expect(pickKeys({ a: 1, b: 2, c: 3 }, ["a", "c", "z"])).toEqual({ a: 1, c: 3 });
  expectTypeOf(pickKeys).parameters.toEqualTypeOf<[{ [key: string]: number }, readonly string[]]>();
  expectTypeOf(pickKeys).returns.toEqualTypeOf<{ [key: string]: number }>();
});

test("問13 removeKey", () => {
  const record = { a: 1, b: 2 };
  expect(removeKey(record, "a")).toEqual({ b: 2 });
  expect(record).toEqual({ a: 1, b: 2 });
  expectTypeOf(removeKey).parameters.toEqualTypeOf<[{ [key: string]: number }, string]>();
  expectTypeOf(removeKey).returns.toEqualTypeOf<{ [key: string]: number }>();
});

test("問14 mergeCounts", () => {
  expect(mergeCounts({ a: 1, b: 2 }, { b: 3, c: 4 })).toEqual({ a: 1, b: 5, c: 4 });
  expectTypeOf(mergeCounts).parameters.toEqualTypeOf<
    [{ [key: string]: number }, { [key: string]: number }]
  >();
  expectTypeOf(mergeCounts).returns.toEqualTypeOf<{ [key: string]: number }>();
});

test("問15 groupByLength", () => {
  expect(groupByLength(["a", "bb", "c"])).toEqual({ "1": ["a", "c"], "2": ["bb"] });
  expectTypeOf(groupByLength).parameters.toEqualTypeOf<[readonly string[]]>();
  expectTypeOf(groupByLength).returns.toEqualTypeOf<{ [length: string]: string[] }>();
});

test("問16 priceOf", () => {
  expect(priceOf({ りんご: 150 }, "りんご")).toBe(150);
  expect(() => priceOf({ りんご: 150 }, "メロン")).toThrow(Error);
  expectTypeOf(priceOf).parameters.toEqualTypeOf<[{ [item: string]: number }, string]>();
  expectTypeOf(priceOf).returns.toEqualTypeOf<number>();
});

test("問17 orderTotal", () => {
  expect(orderTotal({ りんご: 150, みかん: 80 }, { りんご: 2, みかん: 3 })).toBe(540);
  expect(() => orderTotal({ りんご: 150 }, { メロン: 1 })).toThrow(Error);
  expectTypeOf(orderTotal).parameters.toEqualTypeOf<
    [{ [item: string]: number }, { [item: string]: number }]
  >();
  expectTypeOf(orderTotal).returns.toEqualTypeOf<number>();
});

test("問18 filterAtLeast", () => {
  expect(filterAtLeast({ a: 1, b: 5, c: 3 }, 3)).toEqual({ b: 5, c: 3 });
  expectTypeOf(filterAtLeast).parameters.toEqualTypeOf<[{ [key: string]: number }, number]>();
  expectTypeOf(filterAtLeast).returns.toEqualTypeOf<{ [key: string]: number }>();
});

test("問19 entriesText", () => {
  expect(entriesText({ a: 1, b: 2 })).toBe("a=1, b=2");
  expect(entriesText({})).toBe("");
  expectTypeOf(entriesText).parameters.toEqualTypeOf<[{ [key: string]: number }]>();
  expectTypeOf(entriesText).returns.toEqualTypeOf<string>();
});

test("問20 lookupOr", () => {
  expect(lookupOr({ ja: "こんにちは" }, "ja", "?")).toBe("こんにちは");
  expect(lookupOr({ ja: "こんにちは" }, "en", "?")).toBe("?");
  expectTypeOf(lookupOr).parameters.toEqualTypeOf<[{ [key: string]: string }, string, string]>();
  expectTypeOf(lookupOr).returns.toEqualTypeOf<string>();
});
