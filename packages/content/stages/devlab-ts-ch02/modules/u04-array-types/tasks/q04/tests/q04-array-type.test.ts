import { describe, expect, expectTypeOf, test } from "vitest";
import { doubleAll, max, positives, sum } from "../src/q04-array-type";

describe("sum", () => {
  test("合計を返す", () => {
    expect(sum([1, 2, 3, 4])).toBe(10);
    expect(sum([-5, 5])).toBe(0);
  });

  test("空の配列なら 0", () => {
    expect(sum([])).toBe(0);
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(sum).parameters.toEqualTypeOf<[readonly number[]]>();
    expectTypeOf(sum).returns.toEqualTypeOf<number>();
  });
});

describe("max", () => {
  test("最大値を返す", () => {
    expect(max([3, 9, 2])).toBe(9);
    expect(max([-3, -1, -2])).toBe(-1);
  });

  test("空の配列なら Error を投げる", () => {
    expect(() => max([])).toThrow(Error);
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(max).parameters.toEqualTypeOf<[readonly number[]]>();
    expectTypeOf(max).returns.toEqualTypeOf<number>();
  });
});

describe("doubleAll", () => {
  test("2倍にした新しい配列を返し、元の配列は変えない", () => {
    const numbers = [1, 2, 3];
    expect(doubleAll(numbers)).toEqual([2, 4, 6]);
    expect(numbers).toEqual([1, 2, 3]);
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(doubleAll).parameters.toEqualTypeOf<[readonly number[]]>();
    expectTypeOf(doubleAll).returns.toEqualTypeOf<number[]>();
  });
});

describe("positives", () => {
  test("0より大きい要素だけを返す", () => {
    expect(positives([3, -1, 0, 5])).toEqual([3, 5]);
    expect(positives([-1, 0])).toEqual([]);
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(positives).parameters.toEqualTypeOf<[readonly number[]]>();
    expectTypeOf(positives).returns.toEqualTypeOf<number[]>();
  });
});
