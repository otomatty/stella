import { describe, expect, expectTypeOf, test } from "vitest";
import { errorMessage, parseAge, parseAges, safeParseAge } from "../src/q05-exception";

describe("parseAge", () => {
  test("年齢を数値にする", () => {
    expect(parseAge("30")).toBe(30);
    expect(parseAge(" 0 ")).toBe(0);
    expect(parseAge("150")).toBe(150);
  });

  test("読めなければ、決められたメッセージで例外を投げる", () => {
    expect(() => parseAge("abc")).toThrow("年齢として読めません: abc");
    expect(() => parseAge("151")).toThrow("年齢として読めません: 151");
    expect(() => parseAge("1.5")).toThrow("年齢として読めません: 1.5");
    expect(() => parseAge("")).toThrow("年齢として読めません: ");
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(parseAge).parameters.toEqualTypeOf<[string]>();
    expectTypeOf(parseAge).returns.toEqualTypeOf<number>();
  });
});

describe("safeParseAge", () => {
  test("読めなければ null を返す", () => {
    expect(safeParseAge("30")).toBe(30);
    expect(safeParseAge("abc")).toBeNull();
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(safeParseAge).parameters.toEqualTypeOf<[string]>();
    expectTypeOf(safeParseAge).returns.toEqualTypeOf<number | null>();
  });
});

describe("errorMessage", () => {
  test("Error、文字列、それ以外", () => {
    expect(errorMessage(new Error("失敗しました"))).toBe("失敗しました");
    expect(errorMessage(new RangeError("範囲外です"))).toBe("範囲外です");
    expect(errorMessage("文字列のエラー")).toBe("文字列のエラー");
    expect(errorMessage(42)).toBe("不明なエラー");
    expect(errorMessage(null)).toBe("不明なエラー");
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(errorMessage).parameters.toEqualTypeOf<[unknown]>();
    expectTypeOf(errorMessage).returns.toEqualTypeOf<string>();
  });
});

describe("parseAges", () => {
  test("読めたものと、読めなかったメッセージを分ける", () => {
    expect(parseAges(["30", "abc", " 5 ", "999"])).toEqual({
      ages: [30, 5],
      errors: ["年齢として読めません: abc", "年齢として読めません: 999"],
    });
    expect(parseAges([])).toEqual({ ages: [], errors: [] });
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(parseAges).parameters.toEqualTypeOf<[readonly string[]]>();
    expectTypeOf(parseAges).returns.toEqualTypeOf<{ ages: number[]; errors: string[] }>();
  });
});
