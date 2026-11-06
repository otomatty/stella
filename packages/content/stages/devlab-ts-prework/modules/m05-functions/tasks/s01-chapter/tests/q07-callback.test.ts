import { describe, expect, expectTypeOf, test } from "vitest";
import { applyRule, countIf, findFirst, repeatCall } from "../src/q07-callback";

describe("applyRule", () => {
  test("それぞれに rule を当てはめる", () => {
    expect(applyRule([100, 200], (p) => p * 2)).toEqual([200, 400]);
    expect(applyRule([1000, 1500], (p) => Math.floor(p * 0.9))).toEqual([900, 1350]);
    expect(applyRule([], (p) => p)).toEqual([]);
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(applyRule).parameters.toEqualTypeOf<
      [readonly number[], (price: number) => number]
    >();
    expectTypeOf(applyRule).returns.toEqualTypeOf<number[]>();
  });
});

describe("countIf", () => {
  test("predicate が true の数", () => {
    expect(countIf(["a", "bb", "ccc"], (s) => s.length >= 2)).toBe(2);
    expect(countIf([], () => true)).toBe(0);
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(countIf).parameters.toEqualTypeOf<
      [readonly string[], (item: string) => boolean]
    >();
    expectTypeOf(countIf).returns.toEqualTypeOf<number>();
  });
});

describe("findFirst", () => {
  test("最初に見つかった要素", () => {
    expect(findFirst([1, 4, 6], (n) => n % 2 === 0)).toBe(4);
    expect(findFirst([1, 3], (n) => n % 2 === 0)).toBeUndefined();
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(findFirst).parameters.toEqualTypeOf<[readonly number[], (n: number) => boolean]>();
    expectTypeOf(findFirst).returns.toEqualTypeOf<number | undefined>();
  });
});

describe("repeatCall", () => {
  test("times 回、何回目かを渡して呼ぶ", () => {
    const calls: number[] = [];
    repeatCall(3, (i) => {
      calls.push(i);
    });
    expect(calls).toEqual([0, 1, 2]);
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(repeatCall).parameters.toEqualTypeOf<[number, (i: number) => void]>();
    expectTypeOf(repeatCall).returns.toBeVoid();
  });
});
