import { describe, expect, expectTypeOf, test } from "vitest";
import { findInGrid, findPair } from "../src/e01-labeled-break";

describe("findPair", () => {
  test("足すと target になる最初の組を返す", () => {
    expect(findPair([1, 4, 6, 3], 7)).toEqual([0, 2]);
    expect(findPair([5, 5], 10)).toEqual([0, 1]);
  });

  test("なければ undefined", () => {
    expect(findPair([1, 2], 10)).toBeUndefined();
    expect(findPair([], 0)).toBeUndefined();
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(findPair).parameters.toEqualTypeOf<[readonly number[], number]>();
    expectTypeOf(findPair).returns.toEqualTypeOf<[number, number] | undefined>();
  });
});

describe("findInGrid", () => {
  test("最初に見つかった位置を返す", () => {
    expect(
      findInGrid(
        [
          [1, 2],
          [3, 4],
        ],
        3,
      ),
    ).toEqual([1, 0]);
    expect(findInGrid([[7, 7]], 7)).toEqual([0, 0]);
  });

  test("なければ undefined", () => {
    expect(findInGrid([[1, 2]], 9)).toBeUndefined();
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(findInGrid).parameters.toEqualTypeOf<[readonly (readonly number[])[], number]>();
    expectTypeOf(findInGrid).returns.toEqualTypeOf<[number, number] | undefined>();
  });
});
