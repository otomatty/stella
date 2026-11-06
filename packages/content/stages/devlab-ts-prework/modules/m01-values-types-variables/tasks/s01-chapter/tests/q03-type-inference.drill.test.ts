// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import {
  SITE_NAME,
  MAX_MEMBERS,
  IS_BETA,
  TAX_RATE,
  double,
  toText,
  isZero,
  sign,
  judge,
  square,
  joinWords,
  halfIfEven,
  ampm,
  bigger,
  charCount,
  isEmptyText,
  yesNo,
  nextYear,
  wrapParen,
  firstChar,
} from "../src/q03-type-inference.drill";

test("問1 SITE_NAME", () => {
  expect(SITE_NAME).toBe("Agora");
  expectTypeOf<typeof SITE_NAME>().toEqualTypeOf<"Agora">();
});

test("問2 MAX_MEMBERS", () => {
  expect(MAX_MEMBERS).toBe(50);
  expectTypeOf<typeof MAX_MEMBERS>().toEqualTypeOf<50>();
});

test("問3 IS_BETA", () => {
  expect(IS_BETA).toBe(true);
  expectTypeOf<typeof IS_BETA>().toEqualTypeOf<true>();
});

test("問4 TAX_RATE", () => {
  expect(TAX_RATE).toBe(0.1);
  expectTypeOf<typeof TAX_RATE>().toEqualTypeOf<0.1>();
});

test("問5 double", () => {
  expect(double(4)).toBe(8);
  expectTypeOf(double).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(double).returns.toEqualTypeOf<number>();
});

test("問6 toText", () => {
  expect(toText(42)).toBe("42");
  expect(toText(-1.5)).toBe("-1.5");
  expectTypeOf(toText).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(toText).returns.toEqualTypeOf<string>();
});

test("問7 isZero", () => {
  expect(isZero(0)).toBe(true);
  expect(isZero(3)).toBe(false);
  expectTypeOf(isZero).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(isZero).returns.toEqualTypeOf<boolean>();
});

test("問8 sign", () => {
  expect(sign(5)).toBe("plus");
  expect(sign(-3)).toBe("minus");
  expect(sign(0)).toBe("zero");
  expectTypeOf(sign).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(sign).returns.toEqualTypeOf<"plus" | "minus" | "zero">();
});

test("問9 judge", () => {
  expect(judge(60)).toBe("合格");
  expect(judge(59)).toBe("不合格");
  expectTypeOf(judge).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(judge).returns.toEqualTypeOf<"合格" | "不合格">();
});

test("問10 square", () => {
  expect(square(5)).toBe(25);
  expect(square(-3)).toBe(9);
  expectTypeOf(square).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(square).returns.toEqualTypeOf<number>();
});

test("問11 joinWords", () => {
  expect(joinWords("Hello", "World")).toBe("Hello World");
  expectTypeOf(joinWords).parameters.toEqualTypeOf<[string, string]>();
  expectTypeOf(joinWords).returns.toEqualTypeOf<string>();
});

test("問12 halfIfEven", () => {
  expect(halfIfEven(8)).toBe(4);
  expect(halfIfEven(7)).toBeUndefined();
  expectTypeOf(halfIfEven).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(halfIfEven).returns.toEqualTypeOf<number | undefined>();
});

test("問13 ampm", () => {
  expect(ampm(0)).toBe("午前");
  expect(ampm(11)).toBe("午前");
  expect(ampm(13)).toBe("午後");
  expectTypeOf(ampm).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(ampm).returns.toEqualTypeOf<"午前" | "午後">();
});

test("問14 bigger", () => {
  expect(bigger(3, 8)).toBe(8);
  expect(bigger(9, 2)).toBe(9);
  expectTypeOf(bigger).parameters.toEqualTypeOf<[number, number]>();
  expectTypeOf(bigger).returns.toEqualTypeOf<number>();
});

test("問15 charCount", () => {
  expect(charCount("TypeScript")).toBe(10);
  expect(charCount("")).toBe(0);
  expectTypeOf(charCount).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(charCount).returns.toEqualTypeOf<number>();
});

test("問16 isEmptyText", () => {
  expect(isEmptyText("")).toBe(true);
  expect(isEmptyText(" ")).toBe(false);
  expectTypeOf(isEmptyText).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(isEmptyText).returns.toEqualTypeOf<boolean>();
});

test("問17 yesNo", () => {
  expect(yesNo(true)).toBe("はい");
  expect(yesNo(false)).toBe("いいえ");
  expectTypeOf(yesNo).parameters.toEqualTypeOf<[boolean]>();
  expectTypeOf(yesNo).returns.toEqualTypeOf<"はい" | "いいえ">();
});

test("問18 nextYear", () => {
  expect(nextYear(2026)).toBe(2027);
  expectTypeOf(nextYear).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(nextYear).returns.toEqualTypeOf<number>();
});

test("問19 wrapParen", () => {
  expect(wrapParen("注")).toBe("(注)");
  expect(wrapParen("")).toBe("()");
  expectTypeOf(wrapParen).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(wrapParen).returns.toEqualTypeOf<string>();
});

test("問20 firstChar", () => {
  expect(firstChar("abc")).toBe("a");
  expect(firstChar("")).toBeUndefined();
  expectTypeOf(firstChar).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(firstChar).returns.toEqualTypeOf<string | undefined>();
});
