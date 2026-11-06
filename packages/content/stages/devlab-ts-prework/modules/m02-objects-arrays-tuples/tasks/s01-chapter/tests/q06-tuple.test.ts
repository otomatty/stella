import { describe, expect, expectTypeOf, test } from "vitest";
import { type Point, distance, midpoint, minMax } from "../src/q06-tuple";

test("Point の型", () => {
  expectTypeOf<Point>().toEqualTypeOf<[number, number]>();
});

describe("distance", () => {
  test("2点間の距離を返す", () => {
    expect(distance([0, 0], [3, 4])).toBe(5);
    expect(distance([1, 1], [1, 1])).toBe(0);
    expect(distance([-1, -1], [2, 3])).toBe(5);
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(distance).parameters.toEqualTypeOf<[Point, Point]>();
    expectTypeOf(distance).returns.toEqualTypeOf<number>();
  });
});

describe("midpoint", () => {
  test("中点を返す", () => {
    expect(midpoint([0, 0], [4, 2])).toEqual([2, 1]);
    expect(midpoint([-2, 3], [2, 5])).toEqual([0, 4]);
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(midpoint).parameters.toEqualTypeOf<[Point, Point]>();
    expectTypeOf(midpoint).returns.toEqualTypeOf<Point>();
  });
});

describe("minMax", () => {
  test("[最小値, 最大値] を返す", () => {
    expect(minMax([3, 1, 2])).toEqual([1, 3]);
    expect(minMax([7])).toEqual([7, 7]);
    expect(minMax([-5, 10, 0])).toEqual([-5, 10]);
  });

  test("空の配列なら Error を投げる", () => {
    expect(() => minMax([])).toThrow(Error);
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(minMax).parameters.toEqualTypeOf<[readonly number[]]>();
    expectTypeOf(minMax).returns.toEqualTypeOf<[number, number]>();
  });
});
