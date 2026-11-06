// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import {
  type Priority,
  type Status,
  DAYS,
  ORIGIN,
  ROLES,
  HTTP_STATUS,
  LEVELS,
  THEME,
  FLAGS,
  ENTRY,
  isStatus,
  statusIndex,
  prevStatus,
  priorityPoint,
  higherPriority,
  monthName,
  allStatuses,
  STATUS_TEXT,
  statusText,
  SIZE_PX,
  sizePx,
  WEEKEND,
  isWeekendDay,
  countByStatus,
  nextMonthName,
} from "../src/q07-as-const.drill";

test("問1 DAYS", () => {
  expect(DAYS).toEqual(["月", "火", "水"]);
  expectTypeOf<typeof DAYS>().toEqualTypeOf<readonly ["月", "火", "水"]>();
});

test("問2 ORIGIN", () => {
  expect(ORIGIN).toEqual({ x: 0, y: 0 });
  expectTypeOf<typeof ORIGIN>().toEqualTypeOf<{ readonly x: 0; readonly y: 0 }>();
});

test("問3 ROLES", () => {
  expect(ROLES).toEqual(["admin", "editor", "viewer"]);
  expectTypeOf<typeof ROLES>().toEqualTypeOf<readonly ["admin", "editor", "viewer"]>();
});

test("問4 HTTP_STATUS", () => {
  expect(HTTP_STATUS).toEqual({ ok: 200, notFound: 404 });
  expectTypeOf<typeof HTTP_STATUS>().toEqualTypeOf<{ readonly ok: 200; readonly notFound: 404 }>();
});

test("問5 LEVELS", () => {
  expect(LEVELS).toEqual([1, 2, 3]);
  expectTypeOf<typeof LEVELS>().toEqualTypeOf<readonly [1, 2, 3]>();
});

test("問6 THEME", () => {
  expect(THEME).toEqual({ primary: "#0066ff", radius: 4 });
  expectTypeOf<typeof THEME>().toEqualTypeOf<{ readonly primary: "#0066ff"; readonly radius: 4 }>();
});

test("問7 FLAGS", () => {
  expect(FLAGS).toEqual({ beta: true, debug: false });
  expectTypeOf<typeof FLAGS>().toEqualTypeOf<{ readonly beta: true; readonly debug: false }>();
});

test("問8 ENTRY", () => {
  expect(ENTRY).toEqual(["key", 1]);
  expectTypeOf<typeof ENTRY>().toEqualTypeOf<readonly ["key", 1]>();
});

test("問9 isStatus", () => {
  expect(isStatus("doing")).toBe(true);
  expect(isStatus("closed")).toBe(false);
  expectTypeOf(isStatus).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(isStatus).returns.toEqualTypeOf<boolean>();
});

test("問10 statusIndex", () => {
  expect(statusIndex("todo")).toBe(0);
  expect(statusIndex("done")).toBe(2);
  expectTypeOf(statusIndex).parameters.toEqualTypeOf<[Status]>();
  expectTypeOf(statusIndex).returns.toEqualTypeOf<number>();
});

test("問11 prevStatus", () => {
  expect(prevStatus("done")).toBe("doing");
  expect(prevStatus("doing")).toBe("todo");
  expect(prevStatus("todo")).toBe("todo");
  expectTypeOf(prevStatus).parameters.toEqualTypeOf<[Status]>();
  expectTypeOf(prevStatus).returns.toEqualTypeOf<Status>();
});

test("問12 priorityPoint", () => {
  expect(priorityPoint("high")).toBe(3);
  expect(priorityPoint("low")).toBe(1);
  expectTypeOf(priorityPoint).parameters.toEqualTypeOf<[Priority]>();
  expectTypeOf(priorityPoint).returns.toEqualTypeOf<number>();
});

test("問13 higherPriority", () => {
  expect(higherPriority("low", "middle")).toBe("middle");
  expect(higherPriority("high", "middle")).toBe("high");
  expect(higherPriority("low", "low")).toBe("low");
  expectTypeOf(higherPriority).parameters.toEqualTypeOf<[Priority, Priority]>();
  expectTypeOf(higherPriority).returns.toEqualTypeOf<Priority>();
});

test("問14 monthName", () => {
  expect(monthName(4)).toBe("4月");
  expect(monthName(12)).toBe("12月");
  expect(() => monthName(13)).toThrow(Error);
  expectTypeOf(monthName).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(monthName).returns.toEqualTypeOf<string>();
});

test("問15 allStatuses", () => {
  expect(allStatuses()).toEqual(["todo", "doing", "done"]);
  expectTypeOf(allStatuses).returns.toEqualTypeOf<Status[]>();
});

test("問16 statusText", () => {
  expect(STATUS_TEXT).toEqual({ todo: "未着手", doing: "作業中", done: "完了" });
  expect(statusText("doing")).toBe("作業中");
  expectTypeOf(statusText).parameters.toEqualTypeOf<[Status]>();
  expectTypeOf(statusText).returns.toEqualTypeOf<"未着手" | "作業中" | "完了">();
});

test("問17 sizePx", () => {
  expectTypeOf<typeof SIZE_PX>().toEqualTypeOf<{
    readonly S: 12;
    readonly M: 16;
    readonly L: 20;
  }>();
  expect(sizePx("L")).toBe(20);
  expectTypeOf(sizePx).parameters.toEqualTypeOf<["S" | "M" | "L"]>();
  expectTypeOf(sizePx).returns.toEqualTypeOf<number>();
});

test("問18 isWeekendDay", () => {
  expectTypeOf<typeof WEEKEND>().toEqualTypeOf<readonly ["土", "日"]>();
  expect(isWeekendDay("日")).toBe(true);
  expect(isWeekendDay("月")).toBe(false);
  expectTypeOf(isWeekendDay).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(isWeekendDay).returns.toEqualTypeOf<boolean>();
});

test("問19 countByStatus", () => {
  expect(countByStatus(["todo", "done", "done"])).toEqual({ todo: 1, doing: 0, done: 2 });
  expect(countByStatus([])).toEqual({ todo: 0, doing: 0, done: 0 });
  expectTypeOf(countByStatus).parameters.toEqualTypeOf<[readonly Status[]]>();
  expectTypeOf(countByStatus).returns.toEqualTypeOf<{
    todo: number;
    doing: number;
    done: number;
  }>();
});

test("問20 nextMonthName", () => {
  expect(nextMonthName(4)).toBe("5月");
  expect(nextMonthName(12)).toBe("1月");
  expect(() => nextMonthName(0)).toThrow(Error);
  expectTypeOf(nextMonthName).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(nextMonthName).returns.toEqualTypeOf<string>();
});
