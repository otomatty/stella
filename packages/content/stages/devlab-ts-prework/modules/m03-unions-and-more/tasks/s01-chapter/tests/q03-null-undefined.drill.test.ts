// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import {
  lengthOrZero,
  upperOrEmpty,
  orDefault,
  nameOrGuest,
  firstLetter,
  cityOf,
  cityOrUnknown,
  emptyToNull,
  indexOrNull,
  parseOrNull,
  isMissing,
  countPresent,
  sumNonNull,
  phoneText,
  managerName,
  nullToUndefined,
  undefinedToNull,
  bothPresent,
  joinPresent,
  lastLoginText,
} from "../src/q03-null-undefined.drill";

test("問1 lengthOrZero", () => {
  expect(lengthOrZero("abc")).toBe(3);
  expect(lengthOrZero(undefined)).toBe(0);
  expectTypeOf(lengthOrZero).parameters.toEqualTypeOf<[string | undefined]>();
  expectTypeOf(lengthOrZero).returns.toEqualTypeOf<number>();
});

test("問2 upperOrEmpty", () => {
  expect(upperOrEmpty("abc")).toBe("ABC");
  expect(upperOrEmpty(null)).toBe("");
  expectTypeOf(upperOrEmpty).parameters.toEqualTypeOf<[string | null]>();
  expectTypeOf(upperOrEmpty).returns.toEqualTypeOf<string>();
});

test("問3 orDefault", () => {
  expect(orDefault(3, 10)).toBe(3);
  expect(orDefault(0, 10)).toBe(0);
  expect(orDefault(undefined, 10)).toBe(10);
  expectTypeOf(orDefault).parameters.toEqualTypeOf<[number | undefined, number]>();
  expectTypeOf(orDefault).returns.toEqualTypeOf<number>();
});

test("問4 nameOrGuest", () => {
  expect(nameOrGuest("山田")).toBe("山田");
  expect(nameOrGuest(null)).toBe("ゲスト");
  expectTypeOf(nameOrGuest).parameters.toEqualTypeOf<[string | null]>();
  expectTypeOf(nameOrGuest).returns.toEqualTypeOf<string>();
});

test("問5 firstLetter", () => {
  expect(firstLetter("abc")).toBe("a");
  expect(firstLetter("")).toBeUndefined();
  expect(firstLetter(undefined)).toBeUndefined();
  expectTypeOf(firstLetter).parameters.toEqualTypeOf<[string | undefined]>();
  expectTypeOf(firstLetter).returns.toEqualTypeOf<string | undefined>();
});

test("問6 cityOf", () => {
  expect(cityOf({ address: { city: "渋谷区" } })).toBe("渋谷区");
  expect(cityOf({})).toBeUndefined();
  expectTypeOf(cityOf).parameters.toEqualTypeOf<[{ address?: { city: string } }]>();
  expectTypeOf(cityOf).returns.toEqualTypeOf<string | undefined>();
});

test("問7 cityOrUnknown", () => {
  expect(cityOrUnknown({ address: { city: "渋谷区" } })).toBe("渋谷区");
  expect(cityOrUnknown({})).toBe("不明");
  expectTypeOf(cityOrUnknown).parameters.toEqualTypeOf<[{ address?: { city: string } }]>();
  expectTypeOf(cityOrUnknown).returns.toEqualTypeOf<string>();
});

test("問8 emptyToNull", () => {
  expect(emptyToNull("")).toBeNull();
  expect(emptyToNull("a")).toBe("a");
  expectTypeOf(emptyToNull).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(emptyToNull).returns.toEqualTypeOf<string | null>();
});

test("問9 indexOrNull", () => {
  expect(indexOrNull(["a", "b"], "b")).toBe(1);
  expect(indexOrNull(["a", "b"], "c")).toBeNull();
  expectTypeOf(indexOrNull).parameters.toEqualTypeOf<[readonly string[], string]>();
  expectTypeOf(indexOrNull).returns.toEqualTypeOf<number | null>();
});

test("問10 parseOrNull", () => {
  expect(parseOrNull("42")).toBe(42);
  expect(parseOrNull("abc")).toBeNull();
  expectTypeOf(parseOrNull).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(parseOrNull).returns.toEqualTypeOf<number | null>();
});

test("問11 isMissing", () => {
  expect(isMissing(null)).toBe(true);
  expect(isMissing(undefined)).toBe(true);
  expect(isMissing("")).toBe(false);
  expectTypeOf(isMissing).parameters.toEqualTypeOf<[string | null | undefined]>();
  expectTypeOf(isMissing).returns.toEqualTypeOf<boolean>();
});

test("問12 countPresent", () => {
  expect(countPresent(["a", undefined, "b"])).toBe(2);
  expect(countPresent([])).toBe(0);
  expectTypeOf(countPresent).parameters.toEqualTypeOf<[readonly (string | undefined)[]]>();
  expectTypeOf(countPresent).returns.toEqualTypeOf<number>();
});

test("問13 sumNonNull", () => {
  expect(sumNonNull([1, null, 2])).toBe(3);
  expect(sumNonNull([null])).toBe(0);
  expectTypeOf(sumNonNull).parameters.toEqualTypeOf<[readonly (number | null)[]]>();
  expectTypeOf(sumNonNull).returns.toEqualTypeOf<number>();
});

test("問14 phoneText", () => {
  expect(phoneText({ phone: "090-0000-0000" })).toBe("090-0000-0000");
  expect(phoneText({ phone: null })).toBe("なし");
  expect(phoneText({})).toBe("なし");
  expectTypeOf(phoneText).parameters.toEqualTypeOf<[{ phone?: string | null }]>();
  expectTypeOf(phoneText).returns.toEqualTypeOf<string>();
});

test("問15 managerName", () => {
  expect(managerName({ manager: { name: "山田" } })).toBe("山田");
  expect(managerName({ manager: null })).toBe("未定");
  expectTypeOf(managerName).parameters.toEqualTypeOf<[{ manager: { name: string } | null }]>();
  expectTypeOf(managerName).returns.toEqualTypeOf<string>();
});

test("問16 nullToUndefined", () => {
  expect(nullToUndefined(null)).toBeUndefined();
  expect(nullToUndefined("a")).toBe("a");
  expectTypeOf(nullToUndefined).parameters.toEqualTypeOf<[string | null]>();
  expectTypeOf(nullToUndefined).returns.toEqualTypeOf<string | undefined>();
});

test("問17 undefinedToNull", () => {
  expect(undefinedToNull(undefined)).toBeNull();
  expect(undefinedToNull("a")).toBe("a");
  expectTypeOf(undefinedToNull).parameters.toEqualTypeOf<[string | undefined]>();
  expectTypeOf(undefinedToNull).returns.toEqualTypeOf<string | null>();
});

test("問18 bothPresent", () => {
  expect(bothPresent("a", "b")).toBe(true);
  expect(bothPresent("a", null)).toBe(false);
  expectTypeOf(bothPresent).parameters.toEqualTypeOf<[string | null, string | null]>();
  expectTypeOf(bothPresent).returns.toEqualTypeOf<boolean>();
});

test("問19 joinPresent", () => {
  expect(joinPresent("山田", "太郎")).toBe("山田 太郎");
  expect(joinPresent("山田", null)).toBe("山田");
  expect(joinPresent(null, "太郎")).toBe("太郎");
  expect(joinPresent(null, null)).toBe("");
  expectTypeOf(joinPresent).parameters.toEqualTypeOf<[string | null, string | null]>();
  expectTypeOf(joinPresent).returns.toEqualTypeOf<string>();
});

test("問20 lastLoginText", () => {
  expect(lastLoginText({ lastLoginAt: new Date("2026-12-01T09:00:00Z") })).toBe("2026-12-01");
  expect(lastLoginText({ lastLoginAt: null })).toBe("未ログイン");
  expectTypeOf(lastLoginText).parameters.toEqualTypeOf<[{ lastLoginAt: Date | null }]>();
  expectTypeOf(lastLoginText).returns.toEqualTypeOf<string>();
});
