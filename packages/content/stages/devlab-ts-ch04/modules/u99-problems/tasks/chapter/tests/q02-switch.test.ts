import { describe, expect, expectTypeOf, test } from "vitest";
import { calculate, daysInMonth, weekdayName } from "../src/q02-switch";

describe("daysInMonth", () => {
  test("月ごとの日数", () => {
    expect(daysInMonth(2026, 1)).toBe(31);
    expect(daysInMonth(2026, 4)).toBe(30);
    expect(daysInMonth(2026, 11)).toBe(30);
    expect(daysInMonth(2026, 12)).toBe(31);
  });

  test("2月はうるう年なら29日", () => {
    expect(daysInMonth(2024, 2)).toBe(29);
    expect(daysInMonth(2026, 2)).toBe(28);
    expect(daysInMonth(1900, 2)).toBe(28);
    expect(daysInMonth(2000, 2)).toBe(29);
  });

  test("1〜12 以外は Error を投げる", () => {
    expect(() => daysInMonth(2026, 0)).toThrow(Error);
    expect(() => daysInMonth(2026, 13)).toThrow(Error);
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(daysInMonth).parameters.toEqualTypeOf<[number, number]>();
    expectTypeOf(daysInMonth).returns.toEqualTypeOf<number>();
  });
});

describe("weekdayName", () => {
  test("番号を曜日にする", () => {
    expect(weekdayName(0)).toBe("日");
    expect(weekdayName(3)).toBe("水");
    expect(weekdayName(6)).toBe("土");
  });

  test("0〜6 以外は Error を投げる", () => {
    expect(() => weekdayName(7)).toThrow(Error);
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(weekdayName).parameters.toEqualTypeOf<[number]>();
    expectTypeOf(weekdayName).returns.toEqualTypeOf<string>();
  });
});

describe("calculate", () => {
  test("四則演算", () => {
    expect(calculate(3, "+", 4)).toBe(7);
    expect(calculate(3, "-", 4)).toBe(-1);
    expect(calculate(3, "*", 4)).toBe(12);
    expect(calculate(3, "/", 4)).toBe(0.75);
  });

  test("0 で割ると Error を投げる", () => {
    expect(() => calculate(1, "/", 0)).toThrow(Error);
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(calculate).parameters.toEqualTypeOf<[number, "+" | "-" | "*" | "/", number]>();
    expectTypeOf(calculate).returns.toEqualTypeOf<number>();
  });
});
