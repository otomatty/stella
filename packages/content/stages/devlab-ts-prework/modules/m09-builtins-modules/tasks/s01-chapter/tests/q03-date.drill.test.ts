// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import {
  makeDate,
  yearOf,
  monthOf,
  weekdayName,
  isWeekend,
  addDays,
  addHours,
  formatDate,
  formatTime,
  formatJapanese,
  parseDate,
  isSameDay,
  isBefore,
  daysBetween,
  ageOn,
  startOfDay,
  endOfMonth,
  daysInMonth,
  latest,
  sortDates,
} from "../src/q03-date.drill";

test("問1 makeDate", () => {
  const date = makeDate(2026, 4, 1);
  expect(date.getFullYear()).toBe(2026);
  expect(date.getMonth()).toBe(3);
  expect(date.getDate()).toBe(1);
  expect(date.getHours()).toBe(0);
  expectTypeOf(makeDate).parameters.toEqualTypeOf<[number, number, number]>();
  expectTypeOf(makeDate).returns.toEqualTypeOf<Date>();
});

test("問2 yearOf", () => {
  expect(yearOf(new Date(2026, 3, 1))).toBe(2026);
  expectTypeOf(yearOf).parameters.toEqualTypeOf<[Date]>();
  expectTypeOf(yearOf).returns.toEqualTypeOf<number>();
});

test("問3 monthOf", () => {
  expect(monthOf(new Date(2026, 3, 1))).toBe(4);
  expect(monthOf(new Date(2026, 0, 1))).toBe(1);
  expectTypeOf(monthOf).parameters.toEqualTypeOf<[Date]>();
  expectTypeOf(monthOf).returns.toEqualTypeOf<number>();
});

test("問4 weekdayName", () => {
  expect(weekdayName(new Date(2026, 3, 1))).toBe("水");
  expect(weekdayName(new Date(2026, 3, 5))).toBe("日");
  expect(weekdayName(new Date(2026, 3, 4))).toBe("土");
  expectTypeOf(weekdayName).parameters.toEqualTypeOf<[Date]>();
  expectTypeOf(weekdayName).returns.toEqualTypeOf<string>();
});

test("問5 isWeekend", () => {
  expect(isWeekend(new Date(2026, 3, 4))).toBe(true);
  expect(isWeekend(new Date(2026, 3, 5))).toBe(true);
  expect(isWeekend(new Date(2026, 3, 6))).toBe(false);
  expectTypeOf(isWeekend).parameters.toEqualTypeOf<[Date]>();
  expectTypeOf(isWeekend).returns.toEqualTypeOf<boolean>();
});

test("問6 addDays", () => {
  const date = new Date(2026, 3, 30, 9);
  expect(addDays(date, 1)).toEqual(new Date(2026, 4, 1, 9));
  expect(addDays(date, -30)).toEqual(new Date(2026, 2, 31, 9));
  expect(date).toEqual(new Date(2026, 3, 30, 9));
  expectTypeOf(addDays).parameters.toEqualTypeOf<[Date, number]>();
  expectTypeOf(addDays).returns.toEqualTypeOf<Date>();
});

test("問7 addHours", () => {
  const date = new Date(2026, 3, 1, 22);
  expect(addHours(date, 3)).toEqual(new Date(2026, 3, 2, 1));
  expect(date.getHours()).toBe(22);
  expectTypeOf(addHours).parameters.toEqualTypeOf<[Date, number]>();
  expectTypeOf(addHours).returns.toEqualTypeOf<Date>();
});

test("問8 formatDate", () => {
  expect(formatDate(new Date(2026, 3, 1))).toBe("2026-04-01");
  expect(formatDate(new Date(2026, 11, 25))).toBe("2026-12-25");
  expectTypeOf(formatDate).parameters.toEqualTypeOf<[Date]>();
  expectTypeOf(formatDate).returns.toEqualTypeOf<string>();
});

test("問9 formatTime", () => {
  expect(formatTime(new Date(2026, 3, 1, 9, 5))).toBe("09:05");
  expect(formatTime(new Date(2026, 3, 1, 23, 59))).toBe("23:59");
  expectTypeOf(formatTime).parameters.toEqualTypeOf<[Date]>();
  expectTypeOf(formatTime).returns.toEqualTypeOf<string>();
});

test("問10 formatJapanese", () => {
  expect(formatJapanese(new Date(2026, 3, 1))).toBe("2026年4月1日（水）");
  expect(formatJapanese(new Date(2026, 11, 25))).toBe("2026年12月25日（金）");
  expectTypeOf(formatJapanese).parameters.toEqualTypeOf<[Date]>();
  expectTypeOf(formatJapanese).returns.toEqualTypeOf<string>();
});

test("問11 parseDate", () => {
  expect(parseDate("2026-04-01")).toEqual(new Date(2026, 3, 1));
  expect(parseDate("2026-12-31")).toEqual(new Date(2026, 11, 31));
  expect(() => parseDate("2026/04/01")).toThrow(Error);
  expectTypeOf(parseDate).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(parseDate).returns.toEqualTypeOf<Date>();
});

test("問12 isSameDay", () => {
  expect(isSameDay(new Date(2026, 3, 1, 9), new Date(2026, 3, 1, 23))).toBe(true);
  expect(isSameDay(new Date(2026, 3, 1), new Date(2026, 4, 1))).toBe(false);
  expect(isSameDay(new Date(2026, 3, 1), new Date(2027, 3, 1))).toBe(false);
  expectTypeOf(isSameDay).parameters.toEqualTypeOf<[Date, Date]>();
  expectTypeOf(isSameDay).returns.toEqualTypeOf<boolean>();
});

test("問13 isBefore", () => {
  expect(isBefore(new Date(2026, 3, 1, 9), new Date(2026, 3, 1, 10))).toBe(true);
  expect(isBefore(new Date(2026, 3, 1, 10), new Date(2026, 3, 1, 10))).toBe(false);
  expectTypeOf(isBefore).parameters.toEqualTypeOf<[Date, Date]>();
  expectTypeOf(isBefore).returns.toEqualTypeOf<boolean>();
});

test("問14 daysBetween", () => {
  expect(daysBetween(new Date(2026, 3, 1, 23), new Date(2026, 3, 2, 1))).toBe(1);
  expect(daysBetween(new Date(2026, 3, 1), new Date(2026, 4, 1))).toBe(30);
  expect(daysBetween(new Date(2026, 3, 10), new Date(2026, 3, 1))).toBe(-9);
  expectTypeOf(daysBetween).parameters.toEqualTypeOf<[Date, Date]>();
  expectTypeOf(daysBetween).returns.toEqualTypeOf<number>();
});

test("問15 ageOn", () => {
  const birthday = new Date(2000, 3, 2);
  expect(ageOn(birthday, new Date(2026, 3, 1))).toBe(25);
  expect(ageOn(birthday, new Date(2026, 3, 2))).toBe(26);
  expect(ageOn(birthday, new Date(2026, 11, 31))).toBe(26);
  expectTypeOf(ageOn).parameters.toEqualTypeOf<[Date, Date]>();
  expectTypeOf(ageOn).returns.toEqualTypeOf<number>();
});

test("問16 startOfDay", () => {
  const date = new Date(2026, 3, 1, 15, 30, 10, 500);
  expect(startOfDay(date)).toEqual(new Date(2026, 3, 1));
  expect(date.getHours()).toBe(15);
  expectTypeOf(startOfDay).parameters.toEqualTypeOf<[Date]>();
  expectTypeOf(startOfDay).returns.toEqualTypeOf<Date>();
});

test("問17 endOfMonth", () => {
  expect(endOfMonth(new Date(2026, 3, 15))).toEqual(new Date(2026, 3, 30));
  expect(endOfMonth(new Date(2026, 11, 1))).toEqual(new Date(2026, 11, 31));
  expectTypeOf(endOfMonth).parameters.toEqualTypeOf<[Date]>();
  expectTypeOf(endOfMonth).returns.toEqualTypeOf<Date>();
});

test("問18 daysInMonth", () => {
  expect(daysInMonth(2028, 2)).toBe(29);
  expect(daysInMonth(2026, 2)).toBe(28);
  expect(daysInMonth(2026, 4)).toBe(30);
  expect(daysInMonth(2026, 12)).toBe(31);
  expectTypeOf(daysInMonth).parameters.toEqualTypeOf<[number, number]>();
  expectTypeOf(daysInMonth).returns.toEqualTypeOf<number>();
});

test("問19 latest", () => {
  const dates = [new Date(2026, 3, 1), new Date(2026, 3, 3), new Date(2026, 3, 2)];
  expect(latest(dates)).toBe(dates[1]);
  expect(latest([])).toBeUndefined();
  expectTypeOf(latest).parameters.toEqualTypeOf<[Date[]]>();
  expectTypeOf(latest).returns.toEqualTypeOf<Date | undefined>();
});

test("問20 sortDates", () => {
  const dates = [new Date(2026, 3, 3), new Date(2026, 3, 1), new Date(2026, 3, 2)];
  expect(sortDates(dates).map((d) => d.getDate())).toEqual([1, 2, 3]);
  expect(dates.map((d) => d.getDate())).toEqual([3, 1, 2]);
  expectTypeOf(sortDates).parameters.toEqualTypeOf<[Date[]]>();
  expectTypeOf(sortDates).returns.toEqualTypeOf<Date[]>();
});
