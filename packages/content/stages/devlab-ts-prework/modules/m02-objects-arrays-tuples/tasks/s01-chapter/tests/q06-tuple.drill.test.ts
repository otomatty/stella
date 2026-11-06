// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import {
  makePair,
  flipPair,
  nameOf,
  countOf,
  addPoints,
  scalePoint,
  distanceFromOrigin,
  toPoint,
  pointText,
  rgbText,
  divmod,
  splitName,
  order2,
  headTail,
  expandRange,
  isOrigin,
  entryText,
  sumPair,
  swapXY,
  withIndex,
} from "../src/q06-tuple.drill";

test("問1 makePair", () => {
  expect(makePair("りんご", 3)).toEqual(["りんご", 3]);
  expectTypeOf(makePair).parameters.toEqualTypeOf<[string, number]>();
  expectTypeOf(makePair).returns.toEqualTypeOf<[string, number]>();
});

test("問2 flipPair", () => {
  expect(flipPair([3, "りんご"])).toEqual(["りんご", 3]);
  expectTypeOf(flipPair).parameters.toEqualTypeOf<[[number, string]]>();
  expectTypeOf(flipPair).returns.toEqualTypeOf<[string, number]>();
});

test("問3 nameOf", () => {
  expect(nameOf(["りんご", 3])).toBe("りんご");
  expectTypeOf(nameOf).parameters.toEqualTypeOf<[[string, number]]>();
  expectTypeOf(nameOf).returns.toEqualTypeOf<string>();
});

test("問4 countOf", () => {
  expect(countOf(["りんご", 3])).toBe(3);
  expectTypeOf(countOf).parameters.toEqualTypeOf<[[string, number]]>();
  expectTypeOf(countOf).returns.toEqualTypeOf<number>();
});

test("問5 addPoints", () => {
  expect(addPoints([1, 2], [3, 4])).toEqual([4, 6]);
  expectTypeOf(addPoints).parameters.toEqualTypeOf<[[number, number], [number, number]]>();
  expectTypeOf(addPoints).returns.toEqualTypeOf<[number, number]>();
});

test("問6 scalePoint", () => {
  expect(scalePoint([1, 2], 3)).toEqual([3, 6]);
  expectTypeOf(scalePoint).parameters.toEqualTypeOf<[[number, number], number]>();
  expectTypeOf(scalePoint).returns.toEqualTypeOf<[number, number]>();
});

test("問7 distanceFromOrigin", () => {
  expect(distanceFromOrigin([3, 4])).toBe(5);
  expect(distanceFromOrigin([0, 0])).toBe(0);
  expectTypeOf(distanceFromOrigin).parameters.toEqualTypeOf<[[number, number]]>();
  expectTypeOf(distanceFromOrigin).returns.toEqualTypeOf<number>();
});

test("問8 toPoint", () => {
  expect(toPoint(1, 2)).toEqual([1, 2]);
  expectTypeOf(toPoint).parameters.toEqualTypeOf<[number, number]>();
  expectTypeOf(toPoint).returns.toEqualTypeOf<[number, number]>();
});

test("問9 pointText", () => {
  expect(pointText([1, 2])).toBe("(1, 2)");
  expectTypeOf(pointText).parameters.toEqualTypeOf<[[number, number]]>();
  expectTypeOf(pointText).returns.toEqualTypeOf<string>();
});

test("問10 rgbText", () => {
  expect(rgbText([255, 0, 0])).toBe("rgb(255, 0, 0)");
  expectTypeOf(rgbText).parameters.toEqualTypeOf<[[number, number, number]]>();
  expectTypeOf(rgbText).returns.toEqualTypeOf<string>();
});

test("問11 divmod", () => {
  expect(divmod(17, 5)).toEqual([3, 2]);
  expect(divmod(10, 5)).toEqual([2, 0]);
  expectTypeOf(divmod).parameters.toEqualTypeOf<[number, number]>();
  expectTypeOf(divmod).returns.toEqualTypeOf<[number, number]>();
});

test("問12 splitName", () => {
  expect(splitName("山田 太郎")).toEqual(["山田", "太郎"]);
  expect(splitName("山田")).toEqual(["山田", ""]);
  expectTypeOf(splitName).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(splitName).returns.toEqualTypeOf<[string, string]>();
});

test("問13 order2", () => {
  expect(order2(5, 2)).toEqual([2, 5]);
  expect(order2(1, 3)).toEqual([1, 3]);
  expectTypeOf(order2).parameters.toEqualTypeOf<[number, number]>();
  expectTypeOf(order2).returns.toEqualTypeOf<[number, number]>();
});

test("問14 headTail", () => {
  expect(headTail(["a", "b", "c"])).toEqual(["a", ["b", "c"]]);
  expect(headTail([])).toEqual([undefined, []]);
  expectTypeOf(headTail).parameters.toEqualTypeOf<[readonly string[]]>();
  expectTypeOf(headTail).returns.toEqualTypeOf<[string | undefined, string[]]>();
});

test("問15 expandRange", () => {
  expect(expandRange([2, 5])).toEqual([2, 3, 4, 5]);
  expect(expandRange([3, 3])).toEqual([3]);
  expectTypeOf(expandRange).parameters.toEqualTypeOf<[[number, number]]>();
  expectTypeOf(expandRange).returns.toEqualTypeOf<number[]>();
});

test("問16 isOrigin", () => {
  expect(isOrigin([0, 0])).toBe(true);
  expect(isOrigin([0, 1])).toBe(false);
  expectTypeOf(isOrigin).parameters.toEqualTypeOf<[[number, number]]>();
  expectTypeOf(isOrigin).returns.toEqualTypeOf<boolean>();
});

test("問17 entryText", () => {
  expect(entryText(["りんご", 3])).toBe("りんご × 3");
  expectTypeOf(entryText).parameters.toEqualTypeOf<[[string, number]]>();
  expectTypeOf(entryText).returns.toEqualTypeOf<string>();
});

test("問18 sumPair", () => {
  expect(sumPair([3, 4])).toBe(7);
  expectTypeOf(sumPair).parameters.toEqualTypeOf<[[number, number]]>();
  expectTypeOf(sumPair).returns.toEqualTypeOf<number>();
});

test("問19 swapXY", () => {
  expect(swapXY([1, 2])).toEqual([2, 1]);
  expectTypeOf(swapXY).parameters.toEqualTypeOf<[[number, number]]>();
  expectTypeOf(swapXY).returns.toEqualTypeOf<[number, number]>();
});

test("問20 withIndex", () => {
  expect(withIndex(["a", "b"])).toEqual([
    [0, "a"],
    [1, "b"],
  ]);
  expectTypeOf(withIndex).parameters.toEqualTypeOf<[readonly string[]]>();
  expectTypeOf(withIndex).returns.toEqualTypeOf<[number, string][]>();
});
