import { describe, expect, expectTypeOf, test } from "vitest";
import { difference, intersection, isSubset, union, unique } from "../src/q02-set";

describe("unique", () => {
  test("重複を除く", () => {
    expect(unique([3, 1, 3, 2, 1])).toEqual([3, 1, 2]);
    expect(unique(["a", "b", "a"])).toEqual(["a", "b"]);
    expect(unique([])).toEqual([]);
  });

  test("元の配列は変えない", () => {
    const items = [1, 1, 2];
    unique(items);
    expect(items).toEqual([1, 1, 2]);
  });

  test("型", () => {
    expectTypeOf(unique([1, 2])).toEqualTypeOf<number[]>();
    expectTypeOf(unique(["a"])).toEqualTypeOf<string[]>();
  });
});

describe("intersection", () => {
  test("両方にある要素", () => {
    expect(intersection([5, 1, 3, 1], [1, 2, 3])).toEqual([1, 3]);
    expect(intersection(["a"], ["b"])).toEqual([]);
  });

  test("型", () => {
    expectTypeOf(intersection(["a"], ["b"])).toEqualTypeOf<string[]>();
  });
});

describe("difference", () => {
  test("a にあって b にない要素", () => {
    expect(difference([5, 1, 3, 5], [1, 2])).toEqual([5, 3]);
    expect(difference([1], [1])).toEqual([]);
  });

  test("型", () => {
    expectTypeOf(difference([1], [2])).toEqualTypeOf<number[]>();
  });
});

describe("union", () => {
  test("どちらかにある要素", () => {
    expect(union([3, 1, 3], [2, 1, 4])).toEqual([3, 1, 2, 4]);
    expect(union([], ["a", "a"])).toEqual(["a"]);
  });

  test("型", () => {
    expectTypeOf(union(["a"], ["b"])).toEqualTypeOf<string[]>();
  });
});

describe("isSubset", () => {
  test("a の要素がすべて b にあるか", () => {
    expect(isSubset([1, 2], [3, 2, 1])).toBe(true);
    expect(isSubset([1, 4], [3, 2, 1])).toBe(false);
    expect(isSubset([], [1])).toBe(true);
    expect(isSubset([1, 1], [1])).toBe(true);
  });

  test("型", () => {
    expectTypeOf(isSubset<number>).returns.toEqualTypeOf<boolean>();
  });
});
