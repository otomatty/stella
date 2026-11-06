import { describe, expect, expectTypeOf, test } from "vitest";
import { chunk, findFirstDuplicate, multiplicationTable } from "../src/q03-for-of";

describe("chunk", () => {
  test("size 個ずつに区切る", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunk([1, 2, 3], 3)).toEqual([[1, 2, 3]]);
    expect(chunk([], 2)).toEqual([]);
  });

  test("size が 1 未満なら Error を投げる", () => {
    expect(() => chunk([1], 0)).toThrow(Error);
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(chunk).parameters.toEqualTypeOf<[readonly number[], number]>();
    expectTypeOf(chunk).returns.toEqualTypeOf<number[][]>();
  });
});

describe("findFirstDuplicate", () => {
  test("いちばん早く2回目が出てきた要素を返す", () => {
    expect(findFirstDuplicate(["a", "b", "c", "b", "a"])).toBe("b");
    expect(findFirstDuplicate(["x", "x"])).toBe("x");
  });

  test("重複がなければ undefined", () => {
    expect(findFirstDuplicate(["a", "b"])).toBeUndefined();
    expect(findFirstDuplicate([])).toBeUndefined();
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(findFirstDuplicate).parameters.toEqualTypeOf<[readonly string[]]>();
    expectTypeOf(findFirstDuplicate).returns.toEqualTypeOf<string | undefined>();
  });
});

describe("multiplicationTable", () => {
  test("n の段を並べる", () => {
    const table = multiplicationTable(3);
    expect(table).toHaveLength(9);
    expect(table[0]).toBe("3 × 1 = 3");
    expect(table[8]).toBe("3 × 9 = 27");
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(multiplicationTable).parameters.toEqualTypeOf<[number]>();
    expectTypeOf(multiplicationTable).returns.toEqualTypeOf<string[]>();
  });
});
