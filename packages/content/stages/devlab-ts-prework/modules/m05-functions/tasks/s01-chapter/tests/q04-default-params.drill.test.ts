// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import {
  greetGuest,
  powerOf,
  pageCount,
  priceText,
  stars,
  bracket,
  limit,
  joinItems,
  withTax,
  rangeOf,
  afterText,
  makeOptions,
  padLeft,
  dateText,
  shorten,
  passOrFail,
  percentage,
  pageTitle,
  timesTable,
  splitBy,
} from "../src/q04-default-params.drill";

test("問1 greetGuest", () => {
  expect(greetGuest()).toBe("こんにちは、ゲストさん");
  expect(greetGuest("山田")).toBe("こんにちは、山田さん");
  expectTypeOf(greetGuest).parameters.toEqualTypeOf<[string?]>();
  expectTypeOf(greetGuest).returns.toEqualTypeOf<string>();
});

test("問2 powerOf", () => {
  expect(powerOf(3)).toBe(9);
  expect(powerOf(2, 10)).toBe(1024);
  expectTypeOf(powerOf).parameters.toEqualTypeOf<[number, number?]>();
  expectTypeOf(powerOf).returns.toEqualTypeOf<number>();
});

test("問3 pageCount", () => {
  expect(pageCount(25)).toBe(3);
  expect(pageCount(25, 5)).toBe(5);
  expect(pageCount(0)).toBe(0);
  expectTypeOf(pageCount).parameters.toEqualTypeOf<[number, number?]>();
  expectTypeOf(pageCount).returns.toEqualTypeOf<number>();
});

test("問4 priceText", () => {
  expect(priceText(1200)).toBe("1,200円");
  expect(priceText(1200, "ドル")).toBe("1,200ドル");
  expectTypeOf(priceText).parameters.toEqualTypeOf<[number, string?]>();
  expectTypeOf(priceText).returns.toEqualTypeOf<string>();
});

test("問5 stars", () => {
  expect(stars()).toBe("***");
  expect(stars("#", 5)).toBe("#####");
  expectTypeOf(stars).parameters.toEqualTypeOf<[string?, number?]>();
  expectTypeOf(stars).returns.toEqualTypeOf<string>();
});

test("問6 bracket", () => {
  expect(bracket("a")).toBe("[a]");
  expect(bracket("a", "(", ")")).toBe("(a)");
  expectTypeOf(bracket).parameters.toEqualTypeOf<[string, string?, string?]>();
  expectTypeOf(bracket).returns.toEqualTypeOf<string>();
});

test("問7 limit", () => {
  expect(limit(150)).toBe(100);
  expect(limit(-5)).toBe(0);
  expect(limit(15, 0, 10)).toBe(10);
  expectTypeOf(limit).parameters.toEqualTypeOf<[number, number?, number?]>();
  expectTypeOf(limit).returns.toEqualTypeOf<number>();
});

test("問8 joinItems", () => {
  expect(joinItems(["a", "b"])).toBe("a, b");
  expect(joinItems(["a", "b"], "/")).toBe("a/b");
  expectTypeOf(joinItems).parameters.toEqualTypeOf<[readonly string[], string?]>();
  expectTypeOf(joinItems).returns.toEqualTypeOf<string>();
});

test("問9 withTax", () => {
  expect(withTax(1000)).toBe(1100);
  expect(withTax(1000, 0.08)).toBe(1080);
  expectTypeOf(withTax).parameters.toEqualTypeOf<[number, number?]>();
  expectTypeOf(withTax).returns.toEqualTypeOf<number>();
});

test("問10 rangeOf", () => {
  expect(rangeOf(3)).toEqual([0, 1, 2]);
  expect(rangeOf(10, 2, 3)).toEqual([2, 5, 8]);
  expectTypeOf(rangeOf).parameters.toEqualTypeOf<[number, number?, number?]>();
  expectTypeOf(rangeOf).returns.toEqualTypeOf<number[]>();
});

test("問11 afterText", () => {
  expect(afterText()).toBe("1秒後");
  expect(afterText(30)).toBe("30秒後");
  expectTypeOf(afterText).parameters.toEqualTypeOf<[number?]>();
  expectTypeOf(afterText).returns.toEqualTypeOf<string>();
});

test("問12 makeOptions", () => {
  expect(makeOptions()).toEqual({ size: "M", color: "black" });
  expect(makeOptions("L")).toEqual({ size: "L", color: "black" });
  expectTypeOf(makeOptions).parameters.toEqualTypeOf<[string?, string?]>();
  expectTypeOf(makeOptions).returns.toEqualTypeOf<{ size: string; color: string }>();
});

test("問13 padLeft", () => {
  expect(padLeft("ab")).toBe("   ab");
  expect(padLeft("7", 3, "0")).toBe("007");
  expectTypeOf(padLeft).parameters.toEqualTypeOf<[string, number?, string?]>();
  expectTypeOf(padLeft).returns.toEqualTypeOf<string>();
});

test("問14 dateText", () => {
  expect(dateText(2026)).toBe("2026-01-01");
  expect(dateText(2026, 12, 4)).toBe("2026-12-04");
  expectTypeOf(dateText).parameters.toEqualTypeOf<[number, number?, number?]>();
  expectTypeOf(dateText).returns.toEqualTypeOf<string>();
});

test("問15 shorten", () => {
  expect(shorten("TypeScript")).toBe("TypeS…");
  expect(shorten("TypeScript", 20)).toBe("TypeScript");
  expectTypeOf(shorten).parameters.toEqualTypeOf<[string, number?]>();
  expectTypeOf(shorten).returns.toEqualTypeOf<string>();
});

test("問16 passOrFail", () => {
  expect(passOrFail(70)).toBe("合格");
  expect(passOrFail(70, 80)).toBe("不合格");
  expectTypeOf(passOrFail).parameters.toEqualTypeOf<[number, number?]>();
  expectTypeOf(passOrFail).returns.toEqualTypeOf<"合格" | "不合格">();
});

test("問17 percentage", () => {
  expect(percentage(25)).toBe(25);
  expect(percentage(25, 200)).toBe(13);
  expectTypeOf(percentage).parameters.toEqualTypeOf<[number, number?]>();
  expectTypeOf(percentage).returns.toEqualTypeOf<number>();
});

test("問18 pageTitle", () => {
  expect(pageTitle("設定")).toBe("設定 | Agora");
  expect(pageTitle("設定", "Lab")).toBe("設定 | Lab");
  expectTypeOf(pageTitle).parameters.toEqualTypeOf<[string, string?]>();
  expectTypeOf(pageTitle).returns.toEqualTypeOf<string>();
});

test("問19 timesTable", () => {
  expect(timesTable(2, 3)).toEqual([2, 4, 6]);
  expect(timesTable(3)).toHaveLength(9);
  expectTypeOf(timesTable).parameters.toEqualTypeOf<[number, number?]>();
  expectTypeOf(timesTable).returns.toEqualTypeOf<number[]>();
});

test("問20 splitBy", () => {
  expect(splitBy("a,b,c")).toEqual(["a", "b", "c"]);
  expect(splitBy("a b", " ")).toEqual(["a", "b"]);
  expectTypeOf(splitBy).parameters.toEqualTypeOf<[string, string?]>();
  expectTypeOf(splitBy).returns.toEqualTypeOf<string[]>();
});
