// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import {
  toId,
  idLength,
  formatValue,
  doubleValue,
  isNumberValue,
  toNumberValue,
  typeLabel,
  sizeOf,
  padValue,
  type Score,
  scoreText,
  type Price,
  priceText,
  type Reply,
  answerText,
  type Width,
  widthCss,
  type Limit,
  isWithinLimit,
  type Port,
  portNumber,
  type Delay,
  delayMs,
  type Level,
  levelValue,
  type UserId,
  sameUser,
  type FontSize,
  fontPx,
  type Temperature,
  tempText,
} from "../src/q01-union-type-alias.drill";

test("問1 toId", () => {
  expect(toId(42)).toBe("42");
  expect(toId("a-1")).toBe("a-1");
  expectTypeOf(toId).parameters.toEqualTypeOf<[string | number]>();
  expectTypeOf(toId).returns.toEqualTypeOf<string>();
});

test("問2 idLength", () => {
  expect(idLength(12345)).toBe(5);
  expect(idLength("ab")).toBe(2);
  expectTypeOf(idLength).parameters.toEqualTypeOf<[string | number]>();
  expectTypeOf(idLength).returns.toEqualTypeOf<number>();
});

test("問3 formatValue", () => {
  expect(formatValue(3.14159)).toBe("3.14");
  expect(formatValue("N/A")).toBe("N/A");
  expectTypeOf(formatValue).parameters.toEqualTypeOf<[string | number]>();
  expectTypeOf(formatValue).returns.toEqualTypeOf<string>();
});

test("問4 doubleValue", () => {
  expect(doubleValue(4)).toBe(8);
  expect(doubleValue("ab")).toBe("abab");
  expectTypeOf(doubleValue).parameters.toEqualTypeOf<[string | number]>();
  expectTypeOf(doubleValue).returns.toEqualTypeOf<string | number>();
});

test("問5 isNumberValue", () => {
  expect(isNumberValue(1)).toBe(true);
  expect(isNumberValue("1")).toBe(false);
  expectTypeOf(isNumberValue).parameters.toEqualTypeOf<[string | number]>();
  expectTypeOf(isNumberValue).returns.toEqualTypeOf<boolean>();
});

test("問6 toNumberValue", () => {
  expect(toNumberValue("12")).toBe(12);
  expect(toNumberValue(7)).toBe(7);
  expectTypeOf(toNumberValue).parameters.toEqualTypeOf<[string | number]>();
  expectTypeOf(toNumberValue).returns.toEqualTypeOf<number>();
});

test("問7 typeLabel", () => {
  expect(typeLabel("a")).toBe("文字列");
  expect(typeLabel(1)).toBe("数値");
  expect(typeLabel(true)).toBe("真偽値");
  expectTypeOf(typeLabel).parameters.toEqualTypeOf<[string | number | boolean]>();
  expectTypeOf(typeLabel).returns.toEqualTypeOf<"文字列" | "数値" | "真偽値">();
});

test("問8 sizeOf", () => {
  expect(sizeOf("abc")).toBe(3);
  expect(sizeOf(10)).toBe(10);
  expectTypeOf(sizeOf).parameters.toEqualTypeOf<[string | number]>();
  expectTypeOf(sizeOf).returns.toEqualTypeOf<number>();
});

test("問9 padValue", () => {
  expect(padValue(7, 3)).toBe("007");
  expect(padValue("12", 4)).toBe("0012");
  expectTypeOf(padValue).parameters.toEqualTypeOf<[string | number, number]>();
  expectTypeOf(padValue).returns.toEqualTypeOf<string>();
});

test("問10 scoreText", () => {
  expectTypeOf<Score>().toEqualTypeOf<number | "欠席">();
  expect(scoreText(80)).toBe("80点");
  expect(scoreText("欠席")).toBe("欠席");
  expectTypeOf(scoreText).parameters.toEqualTypeOf<[Score]>();
  expectTypeOf(scoreText).returns.toEqualTypeOf<string>();
});

test("問11 priceText", () => {
  expectTypeOf<Price>().toEqualTypeOf<number | "非売品">();
  expect(priceText(1200)).toBe("1,200円");
  expect(priceText("非売品")).toBe("非売品");
  expectTypeOf(priceText).parameters.toEqualTypeOf<[Price]>();
  expectTypeOf(priceText).returns.toEqualTypeOf<string>();
});

test("問12 answerText", () => {
  expectTypeOf<Reply>().toEqualTypeOf<boolean | "未回答">();
  expect(answerText(true)).toBe("はい");
  expect(answerText(false)).toBe("いいえ");
  expect(answerText("未回答")).toBe("未回答");
  expectTypeOf(answerText).parameters.toEqualTypeOf<[Reply]>();
  expectTypeOf(answerText).returns.toEqualTypeOf<string>();
});

test("問13 widthCss", () => {
  expectTypeOf<Width>().toEqualTypeOf<number | "auto">();
  expect(widthCss(100)).toBe("100px");
  expect(widthCss("auto")).toBe("auto");
  expectTypeOf(widthCss).parameters.toEqualTypeOf<[Width]>();
  expectTypeOf(widthCss).returns.toEqualTypeOf<string>();
});

test("問14 isWithinLimit", () => {
  expectTypeOf<Limit>().toEqualTypeOf<number | "無制限">();
  expect(isWithinLimit(5, 3)).toBe(false);
  expect(isWithinLimit(3, 3)).toBe(true);
  expect(isWithinLimit(999, "無制限")).toBe(true);
  expectTypeOf(isWithinLimit).parameters.toEqualTypeOf<[number, Limit]>();
  expectTypeOf(isWithinLimit).returns.toEqualTypeOf<boolean>();
});

test("問15 portNumber", () => {
  expectTypeOf<Port>().toEqualTypeOf<number | string>();
  expect(portNumber("8080")).toBe(8080);
  expect(portNumber(3000)).toBe(3000);
  expectTypeOf(portNumber).parameters.toEqualTypeOf<[Port]>();
  expectTypeOf(portNumber).returns.toEqualTypeOf<number>();
});

test("問16 delayMs", () => {
  expectTypeOf<Delay>().toEqualTypeOf<number | "now">();
  expect(delayMs(1.5)).toBe(1500);
  expect(delayMs("now")).toBe(0);
  expectTypeOf(delayMs).parameters.toEqualTypeOf<[Delay]>();
  expectTypeOf(delayMs).returns.toEqualTypeOf<number>();
});

test("問17 levelValue", () => {
  expectTypeOf<Level>().toEqualTypeOf<1 | 2 | 3 | "max">();
  expect(levelValue("max")).toBe(10);
  expect(levelValue(2)).toBe(2);
  expectTypeOf(levelValue).parameters.toEqualTypeOf<[Level]>();
  expectTypeOf(levelValue).returns.toEqualTypeOf<number>();
});

test("問18 sameUser", () => {
  expectTypeOf<UserId>().toEqualTypeOf<string | number>();
  expect(sameUser(1, "1")).toBe(true);
  expect(sameUser(1, 2)).toBe(false);
  expectTypeOf(sameUser).parameters.toEqualTypeOf<[UserId, UserId]>();
  expectTypeOf(sameUser).returns.toEqualTypeOf<boolean>();
});

test("問19 fontPx", () => {
  expectTypeOf<FontSize>().toEqualTypeOf<number | "S" | "M" | "L">();
  expect(fontPx("S")).toBe(12);
  expect(fontPx("M")).toBe(16);
  expect(fontPx("L")).toBe(20);
  expect(fontPx(18)).toBe(18);
  expectTypeOf(fontPx).parameters.toEqualTypeOf<[FontSize]>();
  expectTypeOf(fontPx).returns.toEqualTypeOf<number>();
});

test("問20 tempText", () => {
  expectTypeOf<Temperature>().toEqualTypeOf<number | "不明">();
  expect(tempText(25)).toBe("25℃");
  expect(tempText("不明")).toBe("不明");
  expectTypeOf(tempText).parameters.toEqualTypeOf<[Temperature]>();
  expectTypeOf(tempText).returns.toEqualTypeOf<string>();
});
