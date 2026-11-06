// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import {
  type Admin,
  type Pet,
  type User,
  isText,
  isNum,
  isBool,
  isStringArray,
  isPresent,
  isDefinedNumber,
  isUser,
  isAdmin,
  isDog,
  isCat,
  onlyStrings,
  definedOnly,
  countUsers,
  assertText,
  assertDefined,
  assertUser,
  toUserOrNull,
  isEmailLike,
  isPoint,
  isColorName,
} from "../src/q09-type-guards.drill";

test("問1 isText", () => {
  expect(isText("a")).toBe(true);
  expect(isText(1)).toBe(false);
  expectTypeOf(isText).parameters.toEqualTypeOf<[unknown]>();
  expectTypeOf(isText).guards.toEqualTypeOf<string>();
});

test("問2 isNum", () => {
  expect(isNum(1)).toBe(true);
  expect(isNum(NaN)).toBe(false);
  expect(isNum("1")).toBe(false);
  expectTypeOf(isNum).parameters.toEqualTypeOf<[unknown]>();
  expectTypeOf(isNum).guards.toEqualTypeOf<number>();
});

test("問3 isBool", () => {
  expect(isBool(false)).toBe(true);
  expect(isBool(0)).toBe(false);
  expectTypeOf(isBool).parameters.toEqualTypeOf<[unknown]>();
  expectTypeOf(isBool).guards.toEqualTypeOf<boolean>();
});

test("問4 isStringArray", () => {
  expect(isStringArray(["a", "b"])).toBe(true);
  expect(isStringArray(["a", 1])).toBe(false);
  expect(isStringArray("ab")).toBe(false);
  expectTypeOf(isStringArray).parameters.toEqualTypeOf<[unknown]>();
  expectTypeOf(isStringArray).guards.toEqualTypeOf<string[]>();
});

test("問5 isPresent", () => {
  expect(isPresent("a")).toBe(true);
  expect(isPresent(null)).toBe(false);
  expectTypeOf(isPresent).parameters.toEqualTypeOf<[string | null]>();
  expectTypeOf(isPresent).guards.toEqualTypeOf<string>();
});

test("問6 isDefinedNumber", () => {
  expect(isDefinedNumber(0)).toBe(true);
  expect(isDefinedNumber(undefined)).toBe(false);
  expectTypeOf(isDefinedNumber).parameters.toEqualTypeOf<[number | undefined]>();
  expectTypeOf(isDefinedNumber).guards.toEqualTypeOf<number>();
});

test("問7 isUser", () => {
  expect(isUser({ name: "山田", age: 30 })).toBe(true);
  expect(isUser({ name: "山田" })).toBe(false);
  expect(isUser(null)).toBe(false);
  expectTypeOf(isUser).parameters.toEqualTypeOf<[unknown]>();
  expectTypeOf(isUser).guards.toEqualTypeOf<User>();
});

test("問8 isAdmin", () => {
  expect(isAdmin({ name: "山田", age: 30, role: "admin" })).toBe(true);
  expect(isAdmin({ name: "佐藤", age: 25 })).toBe(false);
  expectTypeOf(isAdmin).parameters.toEqualTypeOf<[User | Admin]>();
  expectTypeOf(isAdmin).guards.toEqualTypeOf<Admin>();
});

test("問9 isDog", () => {
  expect(isDog({ kind: "dog", bark: "ワン" })).toBe(true);
  expect(isDog({ kind: "cat", meow: "ニャー" })).toBe(false);
  expectTypeOf(isDog).parameters.toEqualTypeOf<[Pet]>();
  expectTypeOf(isDog).guards.toEqualTypeOf<{ kind: "dog"; bark: string }>();
});

test("問10 isCat", () => {
  expect(isCat({ kind: "cat", meow: "ニャー" })).toBe(true);
  expect(isCat({ kind: "dog", bark: "ワン" })).toBe(false);
  expectTypeOf(isCat).parameters.toEqualTypeOf<[Pet]>();
  expectTypeOf(isCat).guards.toEqualTypeOf<{ kind: "cat"; meow: string }>();
});

test("問11 onlyStrings", () => {
  expect(onlyStrings(["a", 1, "b"])).toEqual(["a", "b"]);
  expectTypeOf(onlyStrings).parameters.toEqualTypeOf<[readonly unknown[]]>();
  expectTypeOf(onlyStrings).returns.toEqualTypeOf<string[]>();
});

test("問12 definedOnly", () => {
  expect(definedOnly([1, undefined, 2])).toEqual([1, 2]);
  expectTypeOf(definedOnly).parameters.toEqualTypeOf<[readonly (number | undefined)[]]>();
  expectTypeOf(definedOnly).returns.toEqualTypeOf<number[]>();
});

test("問13 countUsers", () => {
  expect(countUsers([{ name: "山田", age: 30 }, "x", { name: "佐藤" }])).toBe(1);
  expectTypeOf(countUsers).parameters.toEqualTypeOf<[readonly unknown[]]>();
  expectTypeOf(countUsers).returns.toEqualTypeOf<number>();
});

test("問14 assertText", () => {
  expect(() => {
    assertText(1);
  }).toThrow("文字列ではありません");
  expect(() => {
    assertText("a");
  }).not.toThrow();
  expectTypeOf(assertText).parameters.toEqualTypeOf<[unknown]>();
  expectTypeOf(assertText).asserts.toEqualTypeOf<string>();
});

test("問15 assertDefined", () => {
  expect(() => {
    assertDefined(undefined);
  }).toThrow("値がありません");
  expect(() => {
    assertDefined("a");
  }).not.toThrow();
  expectTypeOf(assertDefined).parameters.toEqualTypeOf<[string | undefined]>();
  expectTypeOf(assertDefined).asserts.toEqualTypeOf<string>();
});

test("問16 assertUser", () => {
  expect(() => {
    assertUser({});
  }).toThrow("User ではありません");
  expect(() => {
    assertUser({ name: "山田", age: 30 });
  }).not.toThrow();
  expectTypeOf(assertUser).parameters.toEqualTypeOf<[unknown]>();
  expectTypeOf(assertUser).asserts.toEqualTypeOf<User>();
});

test("問17 toUserOrNull", () => {
  expect(toUserOrNull({ name: "山田", age: 30 })).toEqual({ name: "山田", age: 30 });
  expect(toUserOrNull("x")).toBeNull();
  expectTypeOf(toUserOrNull).parameters.toEqualTypeOf<[unknown]>();
  expectTypeOf(toUserOrNull).returns.toEqualTypeOf<User | null>();
});

test("問18 isEmailLike", () => {
  expect(isEmailLike("a@example.com")).toBe(true);
  expect(isEmailLike("example.com")).toBe(false);
  expect(isEmailLike(1)).toBe(false);
  expectTypeOf(isEmailLike).parameters.toEqualTypeOf<[unknown]>();
  expectTypeOf(isEmailLike).guards.toEqualTypeOf<string>();
});

test("問19 isPoint", () => {
  expect(isPoint({ x: 1, y: 2 })).toBe(true);
  expect(isPoint({ x: 1 })).toBe(false);
  expectTypeOf(isPoint).parameters.toEqualTypeOf<[unknown]>();
  expectTypeOf(isPoint).guards.toEqualTypeOf<{ x: number; y: number }>();
});

test("問20 isColorName", () => {
  expect(isColorName("red")).toBe(true);
  expect(isColorName("pink")).toBe(false);
  expectTypeOf(isColorName).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(isColorName).guards.toEqualTypeOf<"red" | "green" | "blue">();
});
