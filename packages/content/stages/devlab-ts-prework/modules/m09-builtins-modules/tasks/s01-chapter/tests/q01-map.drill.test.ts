// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import {
  toMap,
  scoreOf,
  hasName,
  withScore,
  withoutName,
  sizeOf,
  namesOf,
  totalScore,
  toObject,
  fromObject,
  charCounts,
  groupByInitial,
  invert,
  mergeAdd,
  topName,
  sortedByValue,
  atLeast,
  mapValues,
  firstIndex,
  lastSeen,
} from "../src/q01-map.drill";

test("問1 toMap", () => {
  const map = toMap([
    ["山田", 80],
    ["佐藤", 65],
  ]);
  expect(map.get("佐藤")).toBe(65);
  expect(map.size).toBe(2);
  expectTypeOf(toMap).parameters.toEqualTypeOf<[[string, number][]]>();
  expectTypeOf(toMap).returns.toEqualTypeOf<Map<string, number>>();
});

test("問2 scoreOf", () => {
  const scores = new Map([["山田", 80]]);
  expect(scoreOf(scores, "山田")).toBe(80);
  expect(scoreOf(scores, "鈴木")).toBe(0);
  expectTypeOf(scoreOf).parameters.toEqualTypeOf<[Map<string, number>, string]>();
  expectTypeOf(scoreOf).returns.toEqualTypeOf<number>();
});

test("問3 hasName", () => {
  const scores = new Map([["山田", 0]]);
  expect(hasName(scores, "山田")).toBe(true);
  expect(hasName(scores, "佐藤")).toBe(false);
  expectTypeOf(hasName).parameters.toEqualTypeOf<[Map<string, number>, string]>();
  expectTypeOf(hasName).returns.toEqualTypeOf<boolean>();
});

test("問4 withScore", () => {
  const scores = new Map([["山田", 80]]);
  const result = withScore(scores, "鈴木", 90);
  expect([...result.entries()]).toEqual([
    ["山田", 80],
    ["鈴木", 90],
  ]);
  expect(withScore(scores, "山田", 10).get("山田")).toBe(10);
  expect(scores.size).toBe(1);
  expect(scores.get("山田")).toBe(80);
  expectTypeOf(withScore).parameters.toEqualTypeOf<[Map<string, number>, string, number]>();
  expectTypeOf(withScore).returns.toEqualTypeOf<Map<string, number>>();
});

test("問5 withoutName", () => {
  const scores = new Map([
    ["山田", 80],
    ["佐藤", 65],
  ]);
  expect([...withoutName(scores, "山田").keys()]).toEqual(["佐藤"]);
  expect(scores.size).toBe(2);
  expectTypeOf(withoutName).parameters.toEqualTypeOf<[Map<string, number>, string]>();
  expectTypeOf(withoutName).returns.toEqualTypeOf<Map<string, number>>();
});

test("問6 sizeOf", () => {
  expect(sizeOf(new Map([["a", 1]]))).toBe(1);
  expect(sizeOf(new Map())).toBe(0);
  expectTypeOf(sizeOf).parameters.toEqualTypeOf<[Map<string, number>]>();
  expectTypeOf(sizeOf).returns.toEqualTypeOf<number>();
});

test("問7 namesOf", () => {
  const scores = new Map([
    ["山田", 80],
    ["佐藤", 65],
  ]);
  expect(namesOf(scores)).toEqual(["山田", "佐藤"]);
  expectTypeOf(namesOf).parameters.toEqualTypeOf<[Map<string, number>]>();
  expectTypeOf(namesOf).returns.toEqualTypeOf<string[]>();
});

test("問8 totalScore", () => {
  const scores = new Map([
    ["山田", 80],
    ["佐藤", 65],
  ]);
  expect(totalScore(scores)).toBe(145);
  expect(totalScore(new Map())).toBe(0);
  expectTypeOf(totalScore).parameters.toEqualTypeOf<[Map<string, number>]>();
  expectTypeOf(totalScore).returns.toEqualTypeOf<number>();
});

test("問9 toObject", () => {
  const scores = new Map([
    ["山田", 80],
    ["佐藤", 65],
  ]);
  expect(toObject(scores)).toEqual({ 山田: 80, 佐藤: 65 });
  expectTypeOf(toObject).parameters.toEqualTypeOf<[Map<string, number>]>();
  expectTypeOf(toObject).returns.toEqualTypeOf<Record<string, number>>();
});

test("問10 fromObject", () => {
  const map = fromObject({ 山田: 80, 佐藤: 65 });
  expect(map.get("山田")).toBe(80);
  expect([...map.keys()]).toEqual(["山田", "佐藤"]);
  expectTypeOf(fromObject).parameters.toEqualTypeOf<[Record<string, number>]>();
  expectTypeOf(fromObject).returns.toEqualTypeOf<Map<string, number>>();
});

test("問11 charCounts", () => {
  expect([...charCounts("banana").entries()]).toEqual([
    ["b", 1],
    ["a", 3],
    ["n", 2],
  ]);
  expect(charCounts("").size).toBe(0);
  expectTypeOf(charCounts).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(charCounts).returns.toEqualTypeOf<Map<string, number>>();
});

test("問12 groupByInitial", () => {
  expect([...groupByInitial(["apple", "banana", "avocado"]).entries()]).toEqual([
    ["a", ["apple", "avocado"]],
    ["b", ["banana"]],
  ]);
  expectTypeOf(groupByInitial).returns.toEqualTypeOf<Map<string, string[]>>();
});

test("問13 invert", () => {
  const colors = new Map([
    ["red", "赤"],
    ["blue", "青"],
  ]);
  expect([...invert(colors).entries()]).toEqual([
    ["赤", "red"],
    ["青", "blue"],
  ]);
  expectTypeOf(invert).parameters.toEqualTypeOf<[Map<string, string>]>();
  expectTypeOf(invert).returns.toEqualTypeOf<Map<string, string>>();
});

test("問14 mergeAdd", () => {
  const a = new Map([["x", 1]]);
  const b = new Map([
    ["x", 2],
    ["y", 3],
  ]);
  expect([...mergeAdd(a, b).entries()]).toEqual([
    ["x", 3],
    ["y", 3],
  ]);
  expect(a.get("x")).toBe(1);
  expectTypeOf(mergeAdd).parameters.toEqualTypeOf<[Map<string, number>, Map<string, number>]>();
  expectTypeOf(mergeAdd).returns.toEqualTypeOf<Map<string, number>>();
});

test("問15 topName", () => {
  expect(
    topName(
      new Map([
        ["山田", 80],
        ["佐藤", 95],
        ["鈴木", 95],
      ]),
    ),
  ).toBe("佐藤");
  expect(topName(new Map())).toBeUndefined();
  expectTypeOf(topName).parameters.toEqualTypeOf<[Map<string, number>]>();
  expectTypeOf(topName).returns.toEqualTypeOf<string | undefined>();
});

test("問16 sortedByValue", () => {
  const scores = new Map([
    ["a", 1],
    ["b", 3],
    ["c", 1],
  ]);
  expect(sortedByValue(scores)).toEqual([
    ["b", 3],
    ["a", 1],
    ["c", 1],
  ]);
  expectTypeOf(sortedByValue).parameters.toEqualTypeOf<[Map<string, number>]>();
  expectTypeOf(sortedByValue).returns.toEqualTypeOf<[string, number][]>();
});

test("問17 atLeast", () => {
  const scores = new Map([
    ["山田", 80],
    ["佐藤", 65],
    ["鈴木", 70],
  ]);
  expect([...atLeast(scores, 70).keys()]).toEqual(["山田", "鈴木"]);
  expect(scores.size).toBe(3);
  expectTypeOf(atLeast).parameters.toEqualTypeOf<[Map<string, number>, number]>();
  expectTypeOf(atLeast).returns.toEqualTypeOf<Map<string, number>>();
});

test("問18 mapValues", () => {
  const scores = new Map([
    ["a", 1],
    ["b", 2],
  ]);
  expect([...mapValues(scores, (n) => n * 10).entries()]).toEqual([
    ["a", 10],
    ["b", 20],
  ]);
  expectTypeOf(mapValues).parameters.toEqualTypeOf<[Map<string, number>, (n: number) => number]>();
  expectTypeOf(mapValues).returns.toEqualTypeOf<Map<string, number>>();
});

test("問19 firstIndex", () => {
  expect([...firstIndex(["a", "b", "a", "c"]).entries()]).toEqual([
    ["a", 0],
    ["b", 1],
    ["c", 3],
  ]);
  expectTypeOf(firstIndex).returns.toEqualTypeOf<Map<string, number>>();
});

test("問20 lastSeen", () => {
  const events = [
    { user: "a", time: 5 },
    { user: "b", time: 1 },
    { user: "a", time: 3 },
    { user: "b", time: 9 },
  ];
  expect([...lastSeen(events).entries()]).toEqual([
    ["a", 5],
    ["b", 9],
  ]);
  expectTypeOf(lastSeen).returns.toEqualTypeOf<Map<string, number>>();
});
