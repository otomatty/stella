import { describe, expect, expectTypeOf, test } from "vitest";
import { addDays, daysBetween, endOfMonth, formatDate, isWeekend } from "../src/q03-date";

describe("addDays", () => {
  test("n 日後", () => {
    expect(addDays(new Date(2026, 3, 1, 9, 30), 3)).toEqual(new Date(2026, 3, 4, 9, 30));
    expect(addDays(new Date(2026, 3, 29), 3)).toEqual(new Date(2026, 4, 2));
    expect(addDays(new Date(2026, 11, 31), 1)).toEqual(new Date(2027, 0, 1));
    expect(addDays(new Date(2026, 2, 1), -1)).toEqual(new Date(2026, 1, 28));
  });

  test("元の Date は変えない", () => {
    const date = new Date(2026, 3, 1);
    const result = addDays(date, 1);
    expect(date).toEqual(new Date(2026, 3, 1));
    expect(result).not.toBe(date);
  });

  test("型", () => {
    expectTypeOf(addDays).parameters.toEqualTypeOf<[Date, number]>();
    expectTypeOf(addDays).returns.toEqualTypeOf<Date>();
  });
});

describe("formatDate", () => {
  test("YYYY-MM-DD", () => {
    expect(formatDate(new Date(2026, 3, 1))).toBe("2026-04-01");
    expect(formatDate(new Date(2026, 11, 25, 23, 59))).toBe("2026-12-25");
  });

  test("型", () => {
    expectTypeOf(formatDate).returns.toEqualTypeOf<string>();
  });
});

describe("daysBetween", () => {
  test("日付だけで数える", () => {
    expect(daysBetween(new Date(2026, 3, 1), new Date(2026, 3, 11))).toBe(10);
    expect(daysBetween(new Date(2026, 3, 1, 23, 0), new Date(2026, 3, 2, 1, 0))).toBe(1);
    expect(daysBetween(new Date(2026, 11, 31), new Date(2027, 0, 1))).toBe(1);
    expect(daysBetween(new Date(2026, 3, 11), new Date(2026, 3, 1))).toBe(-10);
    expect(daysBetween(new Date(2026, 3, 1, 8), new Date(2026, 3, 1, 20))).toBe(0);
  });

  test("型", () => {
    expectTypeOf(daysBetween).returns.toEqualTypeOf<number>();
  });
});

describe("isWeekend", () => {
  test("土日なら true", () => {
    expect(isWeekend(new Date(2026, 3, 4))).toBe(true);
    expect(isWeekend(new Date(2026, 3, 5))).toBe(true);
    expect(isWeekend(new Date(2026, 3, 6))).toBe(false);
    expect(isWeekend(new Date(2026, 3, 3))).toBe(false);
  });

  test("型", () => {
    expectTypeOf(isWeekend).returns.toEqualTypeOf<boolean>();
  });
});

describe("endOfMonth", () => {
  test("その月の最終日", () => {
    expect(endOfMonth(new Date(2026, 3, 15, 10))).toEqual(new Date(2026, 3, 30));
    expect(endOfMonth(new Date(2028, 1, 1))).toEqual(new Date(2028, 1, 29));
    expect(endOfMonth(new Date(2026, 11, 31))).toEqual(new Date(2026, 11, 31));
  });

  test("型", () => {
    expectTypeOf(endOfMonth).returns.toEqualTypeOf<Date>();
  });
});
