import { describe, expect, expectTypeOf, test } from "vitest";
import { type ParseResult, parseNumber, sumValid, unwrapOr } from "../src/q05-result";

test("ParseResult の型", () => {
  expectTypeOf<ParseResult>().toEqualTypeOf<
    { ok: true; value: number } | { ok: false; error: string }
  >();
});

describe("parseNumber", () => {
  test("数値に変換できれば成功", () => {
    expect(parseNumber(" 42 ")).toEqual({ ok: true, value: 42 });
    expect(parseNumber("-1.5")).toEqual({ ok: true, value: -1.5 });
    expect(parseNumber("0")).toEqual({ ok: true, value: 0 });
  });

  test("変換できなければ失敗", () => {
    expect(parseNumber("abc")).toEqual({ ok: false, error: "数値ではありません: abc" });
    expect(parseNumber("12px")).toEqual({ ok: false, error: "数値ではありません: 12px" });
    expect(parseNumber("Infinity")).toEqual({ ok: false, error: "数値ではありません: Infinity" });
  });

  test("空の文字列は失敗", () => {
    expect(parseNumber("  ")).toEqual({ ok: false, error: "数値ではありません:   " });
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(parseNumber).parameters.toEqualTypeOf<[string]>();
    expectTypeOf(parseNumber).returns.toEqualTypeOf<ParseResult>();
  });
});

describe("unwrapOr", () => {
  test("成功なら value、失敗なら fallback", () => {
    expect(unwrapOr({ ok: true, value: 3 }, 0)).toBe(3);
    expect(unwrapOr({ ok: false, error: "x" }, 0)).toBe(0);
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(unwrapOr).parameters.toEqualTypeOf<[ParseResult, number]>();
    expectTypeOf(unwrapOr).returns.toEqualTypeOf<number>();
  });
});

describe("sumValid", () => {
  test("成功したものだけを合計する", () => {
    expect(sumValid(["10", "x", " 5 ", ""].map(parseNumber))).toBe(15);
    expect(sumValid([])).toBe(0);
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(sumValid).parameters.toEqualTypeOf<[readonly ParseResult[]]>();
    expectTypeOf(sumValid).returns.toEqualTypeOf<number>();
  });
});
