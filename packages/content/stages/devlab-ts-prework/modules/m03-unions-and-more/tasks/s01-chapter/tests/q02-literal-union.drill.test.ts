// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import {
  type Direction,
  type Plan,
  type Weekday,
  turnRight,
  parseDirection,
  isVertical,
  arrowOf,
  nextWeekday,
  parseWeekday,
  isFriday,
  planPrice,
  upgrade,
  parsePlan,
  type Coin,
  flipCoin,
  type Answer,
  parseAnswer,
  type Theme,
  resolveTheme,
  type Unit,
  toMillimeters,
  type Grade,
  gradeFrom,
  type Rank,
  rankPoint,
  type TaskStatus,
  isFinished,
  type Signal,
  canGo,
  type Lang,
  hello,
  type Visibility,
  canView,
} from "../src/q02-literal-union.drill";

test("問1 turnRight", () => {
  expect(turnRight("up")).toBe("right");
  expect(turnRight("right")).toBe("down");
  expect(turnRight("down")).toBe("left");
  expect(turnRight("left")).toBe("up");
  expectTypeOf(turnRight).parameters.toEqualTypeOf<[Direction]>();
  expectTypeOf(turnRight).returns.toEqualTypeOf<Direction>();
});

test("問2 parseDirection", () => {
  expect(parseDirection(" UP ")).toBe("up");
  expect(parseDirection("left")).toBe("left");
  expect(parseDirection("forward")).toBeUndefined();
  expectTypeOf(parseDirection).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(parseDirection).returns.toEqualTypeOf<Direction | undefined>();
});

test("問3 isVertical", () => {
  expect(isVertical("down")).toBe(true);
  expect(isVertical("left")).toBe(false);
  expectTypeOf(isVertical).parameters.toEqualTypeOf<[Direction]>();
  expectTypeOf(isVertical).returns.toEqualTypeOf<boolean>();
});

test("問4 arrowOf", () => {
  expect(arrowOf("up")).toBe("↑");
  expect(arrowOf("down")).toBe("↓");
  expect(arrowOf("left")).toBe("←");
  expect(arrowOf("right")).toBe("→");
  expectTypeOf(arrowOf).parameters.toEqualTypeOf<[Direction]>();
  expectTypeOf(arrowOf).returns.toEqualTypeOf<"↑" | "↓" | "←" | "→">();
});

test("問5 nextWeekday", () => {
  expect(nextWeekday("月")).toBe("火");
  expect(nextWeekday("木")).toBe("金");
  expect(nextWeekday("金")).toBe("月");
  expectTypeOf(nextWeekday).parameters.toEqualTypeOf<[Weekday]>();
  expectTypeOf(nextWeekday).returns.toEqualTypeOf<Weekday>();
});

test("問6 parseWeekday", () => {
  expect(parseWeekday("水曜日")).toBe("水");
  expect(parseWeekday("金")).toBe("金");
  expect(parseWeekday("土曜日")).toBeUndefined();
  expectTypeOf(parseWeekday).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(parseWeekday).returns.toEqualTypeOf<Weekday | undefined>();
});

test("問7 isFriday", () => {
  expect(isFriday("金")).toBe(true);
  expect(isFriday("月")).toBe(false);
  expectTypeOf(isFriday).parameters.toEqualTypeOf<[Weekday]>();
  expectTypeOf(isFriday).returns.toEqualTypeOf<boolean>();
});

test("問8 planPrice", () => {
  expect(planPrice("free")).toBe(0);
  expect(planPrice("pro")).toBe(1000);
  expect(planPrice("enterprise")).toBe(5000);
  expectTypeOf(planPrice).parameters.toEqualTypeOf<[Plan]>();
  expectTypeOf(planPrice).returns.toEqualTypeOf<number>();
});

test("問9 upgrade", () => {
  expect(upgrade("free")).toBe("pro");
  expect(upgrade("pro")).toBe("enterprise");
  expect(upgrade("enterprise")).toBe("enterprise");
  expectTypeOf(upgrade).parameters.toEqualTypeOf<[Plan]>();
  expectTypeOf(upgrade).returns.toEqualTypeOf<Plan>();
});

test("問10 parsePlan", () => {
  expect(parsePlan("Pro")).toBe("pro");
  expect(parsePlan("FREE")).toBe("free");
  expect(parsePlan("premium")).toBeUndefined();
  expectTypeOf(parsePlan).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(parsePlan).returns.toEqualTypeOf<Plan | undefined>();
});

test("問11 flipCoin", () => {
  expectTypeOf<Coin>().toEqualTypeOf<"表" | "裏">();
  expect(flipCoin("表")).toBe("裏");
  expect(flipCoin("裏")).toBe("表");
  expectTypeOf(flipCoin).parameters.toEqualTypeOf<[Coin]>();
  expectTypeOf(flipCoin).returns.toEqualTypeOf<Coin>();
});

test("問12 parseAnswer", () => {
  expectTypeOf<Answer>().toEqualTypeOf<"yes" | "no" | "maybe">();
  expect(parseAnswer("YES")).toBe("yes");
  expect(parseAnswer("maybe")).toBe("maybe");
  expect(parseAnswer("ok")).toBeUndefined();
  expectTypeOf(parseAnswer).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(parseAnswer).returns.toEqualTypeOf<Answer | undefined>();
});

test("問13 resolveTheme", () => {
  expectTypeOf<Theme>().toEqualTypeOf<"light" | "dark" | "system">();
  expect(resolveTheme("system", true)).toBe("dark");
  expect(resolveTheme("system", false)).toBe("light");
  expect(resolveTheme("light", true)).toBe("light");
  expectTypeOf(resolveTheme).parameters.toEqualTypeOf<[Theme, boolean]>();
  expectTypeOf(resolveTheme).returns.toEqualTypeOf<"light" | "dark">();
});

test("問14 toMillimeters", () => {
  expectTypeOf<Unit>().toEqualTypeOf<"mm" | "cm" | "m">();
  expect(toMillimeters(1.5, "m")).toBe(1500);
  expect(toMillimeters(3, "cm")).toBe(30);
  expect(toMillimeters(7, "mm")).toBe(7);
  expectTypeOf(toMillimeters).parameters.toEqualTypeOf<[number, Unit]>();
  expectTypeOf(toMillimeters).returns.toEqualTypeOf<number>();
});

test("問15 gradeFrom", () => {
  expectTypeOf<Grade>().toEqualTypeOf<"A" | "B" | "C" | "D">();
  expect(gradeFrom(90)).toBe("A");
  expect(gradeFrom(75)).toBe("B");
  expect(gradeFrom(50)).toBe("C");
  expect(gradeFrom(49)).toBe("D");
  expectTypeOf(gradeFrom).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(gradeFrom).returns.toEqualTypeOf<Grade>();
});

test("問16 rankPoint", () => {
  expectTypeOf<Rank>().toEqualTypeOf<"gold" | "silver" | "bronze">();
  expect(rankPoint("gold")).toBe(3);
  expect(rankPoint("silver")).toBe(2);
  expect(rankPoint("bronze")).toBe(1);
  expectTypeOf(rankPoint).parameters.toEqualTypeOf<[Rank]>();
  expectTypeOf(rankPoint).returns.toEqualTypeOf<number>();
});

test("問17 isFinished", () => {
  expectTypeOf<TaskStatus>().toEqualTypeOf<"todo" | "doing" | "done">();
  expect(isFinished("done")).toBe(true);
  expect(isFinished("doing")).toBe(false);
  expectTypeOf(isFinished).parameters.toEqualTypeOf<[TaskStatus]>();
  expectTypeOf(isFinished).returns.toEqualTypeOf<boolean>();
});

test("問18 canGo", () => {
  expectTypeOf<Signal>().toEqualTypeOf<"red" | "yellow" | "green">();
  expect(canGo("green")).toBe(true);
  expect(canGo("yellow")).toBe(false);
  expectTypeOf(canGo).parameters.toEqualTypeOf<[Signal]>();
  expectTypeOf(canGo).returns.toEqualTypeOf<boolean>();
});

test("問19 hello", () => {
  expectTypeOf<Lang>().toEqualTypeOf<"ja" | "en">();
  expect(hello("ja")).toBe("こんにちは");
  expect(hello("en")).toBe("Hello");
  expectTypeOf(hello).parameters.toEqualTypeOf<[Lang]>();
  expectTypeOf(hello).returns.toEqualTypeOf<"こんにちは" | "Hello">();
});

test("問20 canView", () => {
  expectTypeOf<Visibility>().toEqualTypeOf<"public" | "private">();
  expect(canView("public", false)).toBe(true);
  expect(canView("private", false)).toBe(false);
  expect(canView("private", true)).toBe(true);
  expectTypeOf(canView).parameters.toEqualTypeOf<[Visibility, boolean]>();
  expectTypeOf(canView).returns.toEqualTypeOf<boolean>();
});
