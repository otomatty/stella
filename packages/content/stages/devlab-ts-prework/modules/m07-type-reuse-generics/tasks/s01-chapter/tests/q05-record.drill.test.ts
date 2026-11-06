// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import {
  type CategoryCount,
  type Schedule,
  emptyCounts,
  type Category,
  countCategories,
  CATEGORY_NAMES,
  categoryName,
  emptySchedule,
  type Weekday,
  addEvent,
  busiestDay,
  topScorer,
  invertRecord,
  sumRecord,
  mapRecord,
  filterRecord,
  fromPairs,
  toPairs,
  priceOf,
  orderTotal,
  WEEKDAY_LABELS,
  weekdayLabel,
  groupByInitial,
  countLetters,
} from "../src/q05-record.drill";

test("問1 CategoryCount", () => {
  expectTypeOf<CategoryCount>().toEqualTypeOf<{ food: number; drink: number; other: number }>();
});

test("問2 Schedule", () => {
  expectTypeOf<Schedule>().toEqualTypeOf<{
    mon: string[];
    tue: string[];
    wed: string[];
    thu: string[];
    fri: string[];
  }>();
});

test("問3 emptyCounts", () => {
  expect(emptyCounts()).toEqual({ food: 0, drink: 0, other: 0 });
  expectTypeOf(emptyCounts).parameters.toEqualTypeOf<[]>();
  expectTypeOf(emptyCounts).returns.toEqualTypeOf<Record<Category, number>>();
});

test("問4 countCategories", () => {
  expect(countCategories(["food", "food", "drink"])).toEqual({ food: 2, drink: 1, other: 0 });
  expectTypeOf(countCategories).parameters.toEqualTypeOf<[readonly Category[]]>();
  expectTypeOf(countCategories).returns.toEqualTypeOf<Record<Category, number>>();
});

test("問5 categoryName", () => {
  expect(categoryName("drink")).toBe("飲み物");
  expectTypeOf(CATEGORY_NAMES).toEqualTypeOf<Record<Category, string>>();
  expectTypeOf(categoryName).parameters.toEqualTypeOf<[Category]>();
  expectTypeOf(categoryName).returns.toEqualTypeOf<string>();
});

test("問6 emptySchedule", () => {
  expect(emptySchedule()).toEqual({ mon: [], tue: [], wed: [], thu: [], fri: [] });
  expectTypeOf(emptySchedule).parameters.toEqualTypeOf<[]>();
  expectTypeOf(emptySchedule).returns.toEqualTypeOf<Record<Weekday, string[]>>();
});

test("問7 addEvent", () => {
  const schedule: Record<Weekday, string[]> = { mon: [], tue: [], wed: [], thu: [], fri: [] };
  expect(addEvent(schedule, "mon", "会議").mon).toEqual(["会議"]);
  expect(schedule.mon).toEqual([]);
  expectTypeOf(addEvent).parameters.toEqualTypeOf<[Record<Weekday, string[]>, Weekday, string]>();
  expectTypeOf(addEvent).returns.toEqualTypeOf<Record<Weekday, string[]>>();
});

test("問8 busiestDay", () => {
  expect(busiestDay({ mon: ["a"], tue: [], wed: ["b", "c"], thu: [], fri: ["d", "e"] })).toBe(
    "wed",
  );
  expect(busiestDay({ mon: [], tue: [], wed: [], thu: [], fri: [] })).toBe("mon");
  expectTypeOf(busiestDay).parameters.toEqualTypeOf<[Record<Weekday, string[]>]>();
  expectTypeOf(busiestDay).returns.toEqualTypeOf<Weekday>();
});

test("問9 topScorer", () => {
  expect(topScorer({ 山田: 70, 佐藤: 90 })).toBe("佐藤");
  expect(topScorer({})).toBeUndefined();
  expectTypeOf(topScorer).parameters.toEqualTypeOf<[Record<string, number>]>();
  expectTypeOf(topScorer).returns.toEqualTypeOf<string | undefined>();
});

test("問10 invertRecord", () => {
  expect(invertRecord({ a: "x", b: "y" })).toEqual({ x: "a", y: "b" });
  expectTypeOf(invertRecord).parameters.toEqualTypeOf<[Record<string, string>]>();
  expectTypeOf(invertRecord).returns.toEqualTypeOf<Record<string, string>>();
});

test("問11 sumRecord", () => {
  expect(sumRecord({ a: 1, b: 2 })).toBe(3);
  expect(sumRecord({})).toBe(0);
  expectTypeOf(sumRecord).parameters.toEqualTypeOf<[Record<string, number>]>();
  expectTypeOf(sumRecord).returns.toEqualTypeOf<number>();
});

test("問12 mapRecord", () => {
  expect(mapRecord({ a: 1, b: 2 }, (n) => n * 10)).toEqual({ a: 10, b: 20 });
  expectTypeOf(mapRecord).parameters.toEqualTypeOf<
    [Record<string, number>, (n: number) => number]
  >();
  expectTypeOf(mapRecord).returns.toEqualTypeOf<Record<string, number>>();
});

test("問13 filterRecord", () => {
  expect(filterRecord({ a: 1, b: 5 }, 3)).toEqual({ b: 5 });
  expectTypeOf(filterRecord).parameters.toEqualTypeOf<[Record<string, number>, number]>();
  expectTypeOf(filterRecord).returns.toEqualTypeOf<Record<string, number>>();
});

test("問14 fromPairs", () => {
  expect(
    fromPairs([
      ["a", 1],
      ["b", 2],
      ["a", 3],
    ]),
  ).toEqual({ a: 3, b: 2 });
  expectTypeOf(fromPairs).parameters.toEqualTypeOf<[readonly [string, number][]]>();
  expectTypeOf(fromPairs).returns.toEqualTypeOf<Record<string, number>>();
});

test("問15 toPairs", () => {
  expect(toPairs({ a: 1, b: 2 })).toEqual([
    ["a", 1],
    ["b", 2],
  ]);
  expectTypeOf(toPairs).parameters.toEqualTypeOf<[Record<string, number>]>();
  expectTypeOf(toPairs).returns.toEqualTypeOf<[string, number][]>();
});

test("問16 priceOf", () => {
  expect(priceOf({ food: 300, drink: 150, other: 500 }, "drink")).toBe(150);
  expectTypeOf(priceOf).parameters.toEqualTypeOf<[Record<Category, number>, Category]>();
  expectTypeOf(priceOf).returns.toEqualTypeOf<number>();
});

test("問17 orderTotal", () => {
  expect(orderTotal({ food: 300, drink: 150, other: 500 }, { food: 2 })).toBe(600);
  expect(orderTotal({ food: 300, drink: 150, other: 500 }, { food: 1, drink: 2 })).toBe(600);
  expect(orderTotal({ food: 300, drink: 150, other: 500 }, {})).toBe(0);
  expectTypeOf(orderTotal).parameters.toEqualTypeOf<
    [Record<Category, number>, Partial<Record<Category, number>>]
  >();
  expectTypeOf(orderTotal).returns.toEqualTypeOf<number>();
});

test("問18 weekdayLabel", () => {
  expect(weekdayLabel("wed")).toBe("水");
  expectTypeOf(WEEKDAY_LABELS).toEqualTypeOf<Record<Weekday, string>>();
  expectTypeOf(weekdayLabel).parameters.toEqualTypeOf<[Weekday]>();
  expectTypeOf(weekdayLabel).returns.toEqualTypeOf<string>();
});

test("問19 groupByInitial", () => {
  expect(groupByInitial(["apple", "avocado", "banana"])).toEqual({
    a: ["apple", "avocado"],
    b: ["banana"],
  });
  expectTypeOf(groupByInitial).parameters.toEqualTypeOf<[readonly string[]]>();
  expectTypeOf(groupByInitial).returns.toEqualTypeOf<Record<string, string[]>>();
});

test("問20 countLetters", () => {
  expect(countLetters("aab")).toEqual({ a: 2, b: 1 });
  expect(countLetters("")).toEqual({});
  expectTypeOf(countLetters).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(countLetters).returns.toEqualTypeOf<Record<string, number>>();
});
