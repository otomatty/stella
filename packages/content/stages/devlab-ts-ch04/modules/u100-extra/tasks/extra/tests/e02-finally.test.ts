import { describe, expect, expectTypeOf, test } from "vitest";
import { processAll } from "../src/e02-finally";

describe("processAll", () => {
  test("合計、エラー、ログを返す", () => {
    expect(processAll(["1", "x", '"a"', "2"])).toEqual({
      total: 3,
      errors: ["読めません: x", '数値ではありません: "a"'],
      log: ["done: 1", "done: x", 'done: "a"', "done: 2"],
    });
  });

  test("空の配列", () => {
    expect(processAll([])).toEqual({ total: 0, errors: [], log: [] });
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(processAll).parameters.toEqualTypeOf<[readonly string[]]>();
    expectTypeOf(processAll).returns.toEqualTypeOf<{
      total: number;
      errors: string[];
      log: string[];
    }>();
  });
});
