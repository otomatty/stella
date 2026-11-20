import { describe, expect, expectTypeOf, test } from "vitest";
import { describeValue, sumNumbers, toNumber } from "../src/q06-unknown";

describe("describeValue", () => {
  test("値の種類ごとの説明", () => {
    expect(describeValue("abc")).toBe("文字列(3文字)");
    expect(describeValue(42)).toBe("数値(42)");
    expect(describeValue(true)).toBe("真偽値(true)");
    expect(describeValue(null)).toBe("null");
    expect(describeValue(undefined)).toBe("undefined");
    expect(describeValue([1, 2])).toBe("配列(要素2個)");
    expect(describeValue(new Date("2026-12-01T09:00:00Z"))).toBe("日付(2026-12-01)");
    expect(describeValue({ a: 1 })).toBe("オブジェクト");
    expect(describeValue(() => 1)).toBe("その他");
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(describeValue).parameters.toEqualTypeOf<[unknown]>();
    expectTypeOf(describeValue).returns.toEqualTypeOf<string>();
  });
});

describe("toNumber", () => {
  test("数値と、数値に変換できる文字列", () => {
    expect(toNumber(3.5)).toBe(3.5);
    expect(toNumber(" 12 ")).toBe(12);
  });

  test("それ以外は null", () => {
    expect(toNumber("abc")).toBeNull();
    expect(toNumber("  ")).toBeNull();
    expect(toNumber(NaN)).toBeNull();
    expect(toNumber(Infinity)).toBeNull();
    expect(toNumber(true)).toBeNull();
    expect(toNumber(null)).toBeNull();
    expect(toNumber([1])).toBeNull();
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(toNumber).parameters.toEqualTypeOf<[unknown]>();
    expectTypeOf(toNumber).returns.toEqualTypeOf<number | null>();
  });
});

describe("sumNumbers", () => {
  test("有限の数値だけを合計する", () => {
    expect(sumNumbers([1, "2", 3, null, NaN, 4.5, Infinity])).toBe(8.5);
    expect(sumNumbers([])).toBe(0);
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(sumNumbers).parameters.toEqualTypeOf<[readonly unknown[]]>();
    expectTypeOf(sumNumbers).returns.toEqualTypeOf<number>();
  });
});
