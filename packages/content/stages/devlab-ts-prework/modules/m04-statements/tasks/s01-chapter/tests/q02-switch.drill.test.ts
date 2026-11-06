// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import {
  dayName,
  seasonOfMonth,
  calc,
  httpMessage,
  planLimit,
  colorHex,
  turnLeft,
  romanDigit,
  gradePoint,
  metersPer,
  sizeOrder,
  dayKind,
  quarterOf,
  moodEmoji,
  fileKind,
  letterKind,
  signalAction,
  keyName,
  elementOf,
  priorityWeight,
} from "../src/q02-switch.drill";

test("問1 dayName", () => {
  expect(dayName(0)).toBe("日");
  expect(dayName(1)).toBe("月");
  expect(dayName(6)).toBe("土");
  expect(dayName(7)).toBe("?");
  expectTypeOf(dayName).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(dayName).returns.toEqualTypeOf<string>();
});

test("問2 seasonOfMonth", () => {
  expect(seasonOfMonth(4)).toBe("春");
  expect(seasonOfMonth(8)).toBe("夏");
  expect(seasonOfMonth(9)).toBe("秋");
  expect(seasonOfMonth(1)).toBe("冬");
  expect(() => seasonOfMonth(13)).toThrow(Error);
  expectTypeOf(seasonOfMonth).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(seasonOfMonth).returns.toEqualTypeOf<"春" | "夏" | "秋" | "冬">();
});

test("問3 calc", () => {
  expect(calc(6, "+", 3)).toBe(9);
  expect(calc(6, "-", 3)).toBe(3);
  expect(calc(6, "*", 3)).toBe(18);
  expect(calc(6, "/", 3)).toBe(2);
  expectTypeOf(calc).parameters.toEqualTypeOf<[number, "+" | "-" | "*" | "/", number]>();
  expectTypeOf(calc).returns.toEqualTypeOf<number>();
});

test("問4 httpMessage", () => {
  expect(httpMessage(200)).toBe("OK");
  expect(httpMessage(201)).toBe("Created");
  expect(httpMessage(404)).toBe("Not Found");
  expect(httpMessage(500)).toBe("Internal Server Error");
  expect(httpMessage(418)).toBe("Unknown");
  expectTypeOf(httpMessage).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(httpMessage).returns.toEqualTypeOf<string>();
});

test("問5 planLimit", () => {
  expect(planLimit("free")).toBe(1);
  expect(planLimit("pro")).toBe(10);
  expect(planLimit("team")).toBe(100);
  expectTypeOf(planLimit).parameters.toEqualTypeOf<["free" | "pro" | "team"]>();
  expectTypeOf(planLimit).returns.toEqualTypeOf<number>();
});

test("問6 colorHex", () => {
  expect(colorHex("red")).toBe("#ff0000");
  expect(colorHex("green")).toBe("#00ff00");
  expect(colorHex("blue")).toBe("#0000ff");
  expectTypeOf(colorHex).parameters.toEqualTypeOf<["red" | "green" | "blue"]>();
  expectTypeOf(colorHex).returns.toEqualTypeOf<string>();
});

test("問7 turnLeft", () => {
  expect(turnLeft("N")).toBe("W");
  expect(turnLeft("W")).toBe("S");
  expect(turnLeft("S")).toBe("E");
  expect(turnLeft("E")).toBe("N");
  expectTypeOf(turnLeft).parameters.toEqualTypeOf<["N" | "E" | "S" | "W"]>();
  expectTypeOf(turnLeft).returns.toEqualTypeOf<"N" | "E" | "S" | "W">();
});

test("問8 romanDigit", () => {
  expect(romanDigit(1)).toBe("I");
  expect(romanDigit(4)).toBe("IV");
  expect(romanDigit(5)).toBe("V");
  expect(romanDigit(6)).toBe("");
  expectTypeOf(romanDigit).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(romanDigit).returns.toEqualTypeOf<string>();
});

test("問9 gradePoint", () => {
  expect(gradePoint("A")).toBe(4);
  expect(gradePoint("B")).toBe(3);
  expect(gradePoint("F")).toBe(0);
  expectTypeOf(gradePoint).parameters.toEqualTypeOf<["A" | "B" | "C" | "D" | "F"]>();
  expectTypeOf(gradePoint).returns.toEqualTypeOf<number>();
});

test("問10 metersPer", () => {
  expect(metersPer("mm")).toBe(0.001);
  expect(metersPer("cm")).toBe(0.01);
  expect(metersPer("m")).toBe(1);
  expect(metersPer("km")).toBe(1000);
  expectTypeOf(metersPer).parameters.toEqualTypeOf<["mm" | "cm" | "m" | "km"]>();
  expectTypeOf(metersPer).returns.toEqualTypeOf<number>();
});

test("問11 sizeOrder", () => {
  expect(sizeOrder("S")).toBe(1);
  expect(sizeOrder("L")).toBe(3);
  expect(sizeOrder("XL")).toBe(4);
  expectTypeOf(sizeOrder).parameters.toEqualTypeOf<["S" | "M" | "L" | "XL"]>();
  expectTypeOf(sizeOrder).returns.toEqualTypeOf<number>();
});

test("問12 dayKind", () => {
  expect(dayKind("月")).toBe("平日");
  expect(dayKind("金")).toBe("平日");
  expect(dayKind("土")).toBe("週末");
  expect(dayKind("日")).toBe("週末");
  expect(() => dayKind("祝")).toThrow(Error);
  expectTypeOf(dayKind).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(dayKind).returns.toEqualTypeOf<"平日" | "週末">();
});

test("問13 quarterOf", () => {
  expect(quarterOf(1)).toBe(1);
  expect(quarterOf(5)).toBe(2);
  expect(quarterOf(9)).toBe(3);
  expect(quarterOf(12)).toBe(4);
  expect(() => quarterOf(0)).toThrow(Error);
  expectTypeOf(quarterOf).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(quarterOf).returns.toEqualTypeOf<1 | 2 | 3 | 4>();
});

test("問14 moodEmoji", () => {
  expect(moodEmoji("happy")).toBe("😊");
  expect(moodEmoji("sad")).toBe("😢");
  expect(moodEmoji("angry")).toBe("😠");
  expectTypeOf(moodEmoji).parameters.toEqualTypeOf<["happy" | "sad" | "angry"]>();
  expectTypeOf(moodEmoji).returns.toEqualTypeOf<"😊" | "😢" | "😠">();
});

test("問15 fileKind", () => {
  expect(fileKind("jpg")).toBe("画像");
  expect(fileKind("mov")).toBe("動画");
  expect(fileKind("pdf")).toBe("文書");
  expect(fileKind("zip")).toBe("その他");
  expectTypeOf(fileKind).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(fileKind).returns.toEqualTypeOf<"画像" | "動画" | "文書" | "その他">();
});

test("問16 letterKind", () => {
  expect(letterKind("a")).toBe("母音");
  expect(letterKind("u")).toBe("母音");
  expect(letterKind("b")).toBe("子音");
  expectTypeOf(letterKind).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(letterKind).returns.toEqualTypeOf<"母音" | "子音">();
});

test("問17 signalAction", () => {
  expect(signalAction("red")).toBe("止まれ");
  expect(signalAction("yellow")).toBe("注意");
  expect(signalAction("green")).toBe("進め");
  expectTypeOf(signalAction).parameters.toEqualTypeOf<["red" | "yellow" | "green"]>();
  expectTypeOf(signalAction).returns.toEqualTypeOf<"止まれ" | "注意" | "進め">();
});

test("問18 keyName", () => {
  expect(keyName(13)).toBe("Enter");
  expect(keyName(27)).toBe("Escape");
  expect(keyName(32)).toBe("Space");
  expect(keyName(65)).toBe("Other");
  expectTypeOf(keyName).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(keyName).returns.toEqualTypeOf<string>();
});

test("問19 elementOf", () => {
  expect(elementOf("牡羊")).toBe("火");
  expect(elementOf("射手")).toBe("火");
  expect(elementOf("乙女")).toBe("地");
  expectTypeOf(elementOf).parameters.toEqualTypeOf<
    ["牡羊" | "獅子" | "射手" | "牡牛" | "乙女" | "山羊"]
  >();
  expectTypeOf(elementOf).returns.toEqualTypeOf<"火" | "地">();
});

test("問20 priorityWeight", () => {
  expect(priorityWeight("high")).toBe(3);
  expect(priorityWeight("middle")).toBe(2);
  expect(priorityWeight("low")).toBe(1);
  expectTypeOf(priorityWeight).parameters.toEqualTypeOf<["high" | "middle" | "low"]>();
  expectTypeOf(priorityWeight).returns.toEqualTypeOf<number>();
});
