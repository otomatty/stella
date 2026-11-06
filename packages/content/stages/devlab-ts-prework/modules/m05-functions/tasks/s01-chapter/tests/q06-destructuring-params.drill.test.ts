// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import {
  hello,
  areaOf,
  fullName,
  pointText,
  optionText,
  priceText,
  firstOf,
  swapped,
  sumOfPair,
  userLabel,
  makeMember,
  pageRange,
  queryText,
  addressText,
  perimeter,
  headAndTail,
  ymd,
  distanceBetween,
  nameWith,
  latLngText,
} from "../src/q06-destructuring-params.drill";

test("問1 hello", () => {
  expect(hello({ name: "山田" })).toBe("こんにちは、山田さん");
  expectTypeOf(hello).parameters.toEqualTypeOf<[{ name: string }]>();
  expectTypeOf(hello).returns.toEqualTypeOf<string>();
});

test("問2 areaOf", () => {
  expect(areaOf({ width: 3, height: 4 })).toBe(12);
  expectTypeOf(areaOf).parameters.toEqualTypeOf<[{ width: number; height: number }]>();
  expectTypeOf(areaOf).returns.toEqualTypeOf<number>();
});

test("問3 fullName", () => {
  expect(fullName({ first: "太郎", last: "山田" })).toBe("山田 太郎");
  expectTypeOf(fullName).parameters.toEqualTypeOf<[{ first: string; last: string }]>();
  expectTypeOf(fullName).returns.toEqualTypeOf<string>();
});

test("問4 pointText", () => {
  expect(pointText({ x: 3 })).toBe("(3, 0)");
  expect(pointText({})).toBe("(0, 0)");
  expectTypeOf(pointText).parameters.toEqualTypeOf<[{ x?: number; y?: number }]>();
  expectTypeOf(pointText).returns.toEqualTypeOf<string>();
});

test("問5 optionText", () => {
  expect(optionText({ color: "red" })).toBe("M/red");
  expect(optionText({})).toBe("M/black");
  expectTypeOf(optionText).parameters.toEqualTypeOf<[{ size?: string; color?: string }]>();
  expectTypeOf(optionText).returns.toEqualTypeOf<string>();
});

test("問6 priceText", () => {
  expect(priceText({ price: 1200 })).toBe("1,200円");
  expect(priceText({ price: 5, currency: "ドル" })).toBe("5ドル");
  expectTypeOf(priceText).parameters.toEqualTypeOf<[{ price: number; currency?: string }]>();
  expectTypeOf(priceText).returns.toEqualTypeOf<string>();
});

test("問7 firstOf", () => {
  expect(firstOf(["a", "b"])).toBe("a");
  expect(firstOf([])).toBeUndefined();
  expectTypeOf(firstOf).parameters.toEqualTypeOf<[readonly string[]]>();
  expectTypeOf(firstOf).returns.toEqualTypeOf<string | undefined>();
});

test("問8 swapped", () => {
  expect(swapped([1, 2])).toEqual([2, 1]);
  expectTypeOf(swapped).parameters.toEqualTypeOf<[[number, number]]>();
  expectTypeOf(swapped).returns.toEqualTypeOf<[number, number]>();
});

test("問9 sumOfPair", () => {
  expect(sumOfPair({ a: 2, b: 5 })).toBe(7);
  expectTypeOf(sumOfPair).parameters.toEqualTypeOf<[{ a: number; b: number }]>();
  expectTypeOf(sumOfPair).returns.toEqualTypeOf<number>();
});

test("問10 userLabel", () => {
  expect(userLabel({ name: "山田", age: 30 })).toBe("山田（30）");
  expect(userLabel({ name: "山田" })).toBe("山田（?）");
  expectTypeOf(userLabel).parameters.toEqualTypeOf<[{ name: string; age?: number }]>();
  expectTypeOf(userLabel).returns.toEqualTypeOf<string>();
});

test("問11 makeMember", () => {
  expect(makeMember({ name: "山田" })).toEqual({ name: "山田", role: "member" });
  expect(makeMember({ name: "佐藤", role: "admin" })).toEqual({ name: "佐藤", role: "admin" });
  expectTypeOf(makeMember).parameters.toEqualTypeOf<
    [{ name: string; role?: "admin" | "member" }]
  >();
  expectTypeOf(makeMember).returns.toEqualTypeOf<{ name: string; role: "admin" | "member" }>();
});

test("問12 pageRange", () => {
  expect(pageRange({ page: 3 })).toEqual({ offset: 20, limit: 10 });
  expect(pageRange({})).toEqual({ offset: 0, limit: 10 });
  expect(pageRange({ page: 2, perPage: 5 })).toEqual({ offset: 5, limit: 5 });
  expectTypeOf(pageRange).parameters.toEqualTypeOf<[{ page?: number; perPage?: number }]>();
  expectTypeOf(pageRange).returns.toEqualTypeOf<{ offset: number; limit: number }>();
});

test("問13 queryText", () => {
  expect(queryText({ q: "ts" })).toBe("q=ts&limit=10");
  expect(queryText({ q: "ts", limit: 3 })).toBe("q=ts&limit=3");
  expectTypeOf(queryText).parameters.toEqualTypeOf<[{ q: string; limit?: number }]>();
  expectTypeOf(queryText).returns.toEqualTypeOf<string>();
});

test("問14 addressText", () => {
  expect(addressText({ pref: "東京都", city: "渋谷区" })).toBe("東京都渋谷区");
  expect(addressText({ pref: "東京都", city: "渋谷区", line: "1-1" })).toBe("東京都渋谷区1-1");
  expectTypeOf(addressText).parameters.toEqualTypeOf<
    [{ pref: string; city: string; line?: string }]
  >();
  expectTypeOf(addressText).returns.toEqualTypeOf<string>();
});

test("問15 perimeter", () => {
  expect(perimeter({ width: 3, height: 4 })).toBe(14);
  expectTypeOf(perimeter).parameters.toEqualTypeOf<[{ width: number; height: number }]>();
  expectTypeOf(perimeter).returns.toEqualTypeOf<number>();
});

test("問16 headAndTail", () => {
  expect(headAndTail([1, 2, 3])).toEqual({ head: 1, tail: [2, 3] });
  expect(headAndTail([])).toEqual({ head: undefined, tail: [] });
  expectTypeOf(headAndTail).parameters.toEqualTypeOf<[readonly number[]]>();
  expectTypeOf(headAndTail).returns.toEqualTypeOf<{ head: number | undefined; tail: number[] }>();
});

test("問17 ymd", () => {
  expect(ymd({ year: 2026, month: 12, day: 4 })).toBe("2026-12-04");
  expectTypeOf(ymd).parameters.toEqualTypeOf<[{ year: number; month: number; day: number }]>();
  expectTypeOf(ymd).returns.toEqualTypeOf<string>();
});

test("問18 distanceBetween", () => {
  expect(distanceBetween({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  expectTypeOf(distanceBetween).parameters.toEqualTypeOf<
    [{ x: number; y: number }, { x: number; y: number }]
  >();
  expectTypeOf(distanceBetween).returns.toEqualTypeOf<number>();
});

test("問19 nameWith", () => {
  expect(nameWith({ first: "太郎", last: "山田" })).toBe("山田 太郎");
  expect(nameWith({ first: "太郎", last: "山田" }, "・")).toBe("山田・太郎");
  expectTypeOf(nameWith).parameters.toEqualTypeOf<[{ first: string; last: string }, string?]>();
  expectTypeOf(nameWith).returns.toEqualTypeOf<string>();
});

test("問20 latLngText", () => {
  expect(latLngText([35.68, 139.76])).toBe("35.68, 139.76");
  expectTypeOf(latLngText).parameters.toEqualTypeOf<[[number, number]]>();
  expectTypeOf(latLngText).returns.toEqualTypeOf<string>();
});
