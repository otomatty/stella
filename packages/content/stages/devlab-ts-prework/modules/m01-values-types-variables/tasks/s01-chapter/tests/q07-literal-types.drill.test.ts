// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import {
  toggle,
  signOf,
  coinSide,
  dayType,
  nextLight,
  gradeOf,
  isSuccess,
  sizeLabel,
  opposite,
  answerOf,
  priorityLabel,
  rollAgain,
  moveX,
  modeLabel,
  bitOf,
  seasonOf,
  compare,
  methodLabel,
  statusColor,
  medal,
} from "../src/q07-literal-types.drill";

test("問1 toggle", () => {
  expect(toggle("on")).toBe("off");
  expect(toggle("off")).toBe("on");
  expectTypeOf(toggle).parameters.toEqualTypeOf<["on" | "off"]>();
  expectTypeOf(toggle).returns.toEqualTypeOf<"on" | "off">();
});

test("問2 signOf", () => {
  expect(signOf(-5)).toBe(-1);
  expect(signOf(0)).toBe(0);
  expect(signOf(8)).toBe(1);
  expectTypeOf(signOf).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(signOf).returns.toEqualTypeOf<-1 | 0 | 1>();
});

test("問3 coinSide", () => {
  expect(coinSide(4)).toBe("表");
  expect(coinSide(3)).toBe("裏");
  expectTypeOf(coinSide).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(coinSide).returns.toEqualTypeOf<"表" | "裏">();
});

test("問4 dayType", () => {
  expect(dayType(0)).toBe("休日");
  expect(dayType(3)).toBe("平日");
  expectTypeOf(dayType).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(dayType).returns.toEqualTypeOf<"平日" | "休日">();
});

test("問5 nextLight", () => {
  expect(nextLight("green")).toBe("yellow");
  expect(nextLight("yellow")).toBe("red");
  expect(nextLight("red")).toBe("green");
  expectTypeOf(nextLight).parameters.toEqualTypeOf<["green" | "yellow" | "red"]>();
  expectTypeOf(nextLight).returns.toEqualTypeOf<"green" | "yellow" | "red">();
});

test("問6 gradeOf", () => {
  expect(gradeOf(80)).toBe("A");
  expect(gradeOf(75)).toBe("B");
  expect(gradeOf(10)).toBe("C");
  expectTypeOf(gradeOf).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(gradeOf).returns.toEqualTypeOf<"A" | "B" | "C">();
});

test("問7 isSuccess", () => {
  expect(isSuccess(200)).toBe(true);
  expect(isSuccess(404)).toBe(false);
  expectTypeOf(isSuccess).parameters.toEqualTypeOf<[200 | 404 | 500]>();
  expectTypeOf(isSuccess).returns.toEqualTypeOf<boolean>();
});

test("問8 sizeLabel", () => {
  expect(sizeLabel("S")).toBe("小");
  expect(sizeLabel("M")).toBe("中");
  expect(sizeLabel("L")).toBe("大");
  expectTypeOf(sizeLabel).parameters.toEqualTypeOf<["S" | "M" | "L"]>();
  expectTypeOf(sizeLabel).returns.toEqualTypeOf<"小" | "中" | "大">();
});

test("問9 opposite", () => {
  expect(opposite("north")).toBe("south");
  expect(opposite("east")).toBe("west");
  expect(opposite("west")).toBe("east");
  expectTypeOf(opposite).parameters.toEqualTypeOf<["north" | "south" | "east" | "west"]>();
  expectTypeOf(opposite).returns.toEqualTypeOf<"north" | "south" | "east" | "west">();
});

test("問10 answerOf", () => {
  expect(answerOf(true)).toBe("yes");
  expect(answerOf(false)).toBe("no");
  expectTypeOf(answerOf).parameters.toEqualTypeOf<[boolean]>();
  expectTypeOf(answerOf).returns.toEqualTypeOf<"yes" | "no">();
});

test("問11 priorityLabel", () => {
  expect(priorityLabel(1)).toBe("高");
  expect(priorityLabel(3)).toBe("低");
  expectTypeOf(priorityLabel).parameters.toEqualTypeOf<[1 | 2 | 3]>();
  expectTypeOf(priorityLabel).returns.toEqualTypeOf<"高" | "中" | "低">();
});

test("問12 rollAgain", () => {
  expect(rollAgain(6)).toBe(true);
  expect(rollAgain(1)).toBe(false);
  expectTypeOf(rollAgain).parameters.toEqualTypeOf<[1 | 2 | 3 | 4 | 5 | 6]>();
  expectTypeOf(rollAgain).returns.toEqualTypeOf<boolean>();
});

test("問13 moveX", () => {
  expect(moveX(5, "left")).toBe(4);
  expect(moveX(5, "right")).toBe(6);
  expectTypeOf(moveX).parameters.toEqualTypeOf<[number, "left" | "right"]>();
  expectTypeOf(moveX).returns.toEqualTypeOf<number>();
});

test("問14 modeLabel", () => {
  expect(modeLabel("light")).toBe("ライトモード");
  expect(modeLabel("dark")).toBe("ダークモード");
  expectTypeOf(modeLabel).parameters.toEqualTypeOf<["light" | "dark"]>();
  expectTypeOf(modeLabel).returns.toEqualTypeOf<"ライトモード" | "ダークモード">();
});

test("問15 bitOf", () => {
  expect(bitOf(true)).toBe(1);
  expect(bitOf(false)).toBe(0);
  expectTypeOf(bitOf).parameters.toEqualTypeOf<[boolean]>();
  expectTypeOf(bitOf).returns.toEqualTypeOf<0 | 1>();
});

test("問16 seasonOf", () => {
  expect(seasonOf(4)).toBe("春");
  expect(seasonOf(8)).toBe("夏");
  expect(seasonOf(11)).toBe("秋");
  expect(seasonOf(1)).toBe("冬");
  expect(seasonOf(12)).toBe("冬");
  expectTypeOf(seasonOf).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(seasonOf).returns.toEqualTypeOf<"春" | "夏" | "秋" | "冬">();
});

test("問17 compare", () => {
  expect(compare(2, 5)).toBe(-1);
  expect(compare(5, 5)).toBe(0);
  expect(compare(9, 5)).toBe(1);
  expectTypeOf(compare).parameters.toEqualTypeOf<[number, number]>();
  expectTypeOf(compare).returns.toEqualTypeOf<-1 | 0 | 1>();
});

test("問18 methodLabel", () => {
  expect(methodLabel("GET")).toBe("取得");
  expect(methodLabel("POST")).toBe("作成");
  expect(methodLabel("DELETE")).toBe("削除");
  expectTypeOf(methodLabel).parameters.toEqualTypeOf<["GET" | "POST" | "DELETE"]>();
  expectTypeOf(methodLabel).returns.toEqualTypeOf<"取得" | "作成" | "削除">();
});

test("問19 statusColor", () => {
  expect(statusColor("online")).toBe("green");
  expect(statusColor("busy")).toBe("red");
  expect(statusColor("offline")).toBe("gray");
  expectTypeOf(statusColor).parameters.toEqualTypeOf<["online" | "busy" | "offline"]>();
  expectTypeOf(statusColor).returns.toEqualTypeOf<"green" | "red" | "gray">();
});

test("問20 medal", () => {
  expect(medal(1)).toBe("金");
  expect(medal(2)).toBe("銀");
  expect(medal(3)).toBe("銅");
  expect(medal(4)).toBe("なし");
  expectTypeOf(medal).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(medal).returns.toEqualTypeOf<"金" | "銀" | "銅" | "なし">();
});
