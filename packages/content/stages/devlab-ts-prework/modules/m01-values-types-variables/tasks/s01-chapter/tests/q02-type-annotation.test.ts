import { describe, expect, expectTypeOf, test } from "vitest";
import { describeMember, formatPrice } from "../src/q02-type-annotation";

describe("formatPrice", () => {
  test("3桁ごとにカンマで区切り、単位を付ける", () => {
    expect(formatPrice(1200, "円")).toBe("1,200円");
    expect(formatPrice(1234567, "円")).toBe("1,234,567円");
    expect(formatPrice(500, "ドル")).toBe("500ドル");
    expect(formatPrice(0, "円")).toBe("0円");
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(formatPrice).parameters.toEqualTypeOf<[number, string]>();
    expectTypeOf(formatPrice).returns.toEqualTypeOf<string>();
  });
});

describe("describeMember", () => {
  test("リーダーなら「・リーダー」を付ける", () => {
    expect(describeMember("佐藤", 28, true)).toBe("佐藤（28歳・リーダー）");
  });

  test("リーダーでなければ年齢だけ", () => {
    expect(describeMember("鈴木", 31, false)).toBe("鈴木（31歳）");
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(describeMember).parameters.toEqualTypeOf<[string, number, boolean]>();
    expectTypeOf(describeMember).returns.toEqualTypeOf<string>();
  });
});
