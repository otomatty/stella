// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import {
  isPositive,
  isNegative,
  isOdd,
  isTeen,
  isWeekend,
  isVowel,
  not,
  both,
  either,
  onlyOne,
  isEmpty,
  isBlank,
  hasDigit,
  isStrongPassword,
  isSameSign,
  canBuy,
  isMultipleOf3Or5,
  isOutOfRange,
  isValidName,
  isOpen,
} from "../src/q06-boolean.drill";

test("問1 isPositive", () => {
  expect(isPositive(3)).toBe(true);
  expect(isPositive(0)).toBe(false);
  expectTypeOf(isPositive).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(isPositive).returns.toEqualTypeOf<boolean>();
});

test("問2 isNegative", () => {
  expect(isNegative(-1)).toBe(true);
  expect(isNegative(0)).toBe(false);
  expectTypeOf(isNegative).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(isNegative).returns.toEqualTypeOf<boolean>();
});

test("問3 isOdd", () => {
  expect(isOdd(3)).toBe(true);
  expect(isOdd(-3)).toBe(true);
  expect(isOdd(4)).toBe(false);
  expectTypeOf(isOdd).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(isOdd).returns.toEqualTypeOf<boolean>();
});

test("問4 isTeen", () => {
  expect(isTeen(13)).toBe(true);
  expect(isTeen(19)).toBe(true);
  expect(isTeen(20)).toBe(false);
  expect(isTeen(12)).toBe(false);
  expectTypeOf(isTeen).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(isTeen).returns.toEqualTypeOf<boolean>();
});

test("問5 isWeekend", () => {
  expect(isWeekend(0)).toBe(true);
  expect(isWeekend(6)).toBe(true);
  expect(isWeekend(3)).toBe(false);
  expectTypeOf(isWeekend).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(isWeekend).returns.toEqualTypeOf<boolean>();
});

test("問6 isVowel", () => {
  expect(isVowel("a")).toBe(true);
  expect(isVowel("E")).toBe(true);
  expect(isVowel("b")).toBe(false);
  expect(isVowel("ae")).toBe(false);
  expectTypeOf(isVowel).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(isVowel).returns.toEqualTypeOf<boolean>();
});

test("問7 not", () => {
  expect(not(true)).toBe(false);
  expect(not(false)).toBe(true);
  expectTypeOf(not).parameters.toEqualTypeOf<[boolean]>();
  expectTypeOf(not).returns.toEqualTypeOf<boolean>();
});

test("問8 both", () => {
  expect(both(true, true)).toBe(true);
  expect(both(true, false)).toBe(false);
  expectTypeOf(both).parameters.toEqualTypeOf<[boolean, boolean]>();
  expectTypeOf(both).returns.toEqualTypeOf<boolean>();
});

test("問9 either", () => {
  expect(either(false, true)).toBe(true);
  expect(either(false, false)).toBe(false);
  expectTypeOf(either).parameters.toEqualTypeOf<[boolean, boolean]>();
  expectTypeOf(either).returns.toEqualTypeOf<boolean>();
});

test("問10 onlyOne", () => {
  expect(onlyOne(true, false)).toBe(true);
  expect(onlyOne(false, true)).toBe(true);
  expect(onlyOne(true, true)).toBe(false);
  expect(onlyOne(false, false)).toBe(false);
  expectTypeOf(onlyOne).parameters.toEqualTypeOf<[boolean, boolean]>();
  expectTypeOf(onlyOne).returns.toEqualTypeOf<boolean>();
});

test("問11 isEmpty", () => {
  expect(isEmpty("")).toBe(true);
  expect(isEmpty(" ")).toBe(false);
  expectTypeOf(isEmpty).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(isEmpty).returns.toEqualTypeOf<boolean>();
});

test("問12 isBlank", () => {
  expect(isBlank("   ")).toBe(true);
  expect(isBlank("")).toBe(true);
  expect(isBlank(" a ")).toBe(false);
  expectTypeOf(isBlank).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(isBlank).returns.toEqualTypeOf<boolean>();
});

test("問13 hasDigit", () => {
  expect(hasDigit("abc1")).toBe(true);
  expect(hasDigit("abc")).toBe(false);
  expectTypeOf(hasDigit).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(hasDigit).returns.toEqualTypeOf<boolean>();
});

test("問14 isStrongPassword", () => {
  expect(isStrongPassword("Agora2026")).toBe(true);
  expect(isStrongPassword("agora2026")).toBe(false);
  expect(isStrongPassword("Agora")).toBe(false);
  expect(isStrongPassword("AgoraAgora")).toBe(false);
  expectTypeOf(isStrongPassword).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(isStrongPassword).returns.toEqualTypeOf<boolean>();
});

test("問15 isSameSign", () => {
  expect(isSameSign(2, 5)).toBe(true);
  expect(isSameSign(-2, -5)).toBe(true);
  expect(isSameSign(-2, 5)).toBe(false);
  expect(isSameSign(0, 5)).toBe(false);
  expectTypeOf(isSameSign).parameters.toEqualTypeOf<[number, number]>();
  expectTypeOf(isSameSign).returns.toEqualTypeOf<boolean>();
});

test("問16 canBuy", () => {
  expect(canBuy(1000, 800, true)).toBe(true);
  expect(canBuy(1000, 800, false)).toBe(false);
  expect(canBuy(500, 800, true)).toBe(false);
  expectTypeOf(canBuy).parameters.toEqualTypeOf<[number, number, boolean]>();
  expectTypeOf(canBuy).returns.toEqualTypeOf<boolean>();
});

test("問17 isMultipleOf3Or5", () => {
  expect(isMultipleOf3Or5(9)).toBe(true);
  expect(isMultipleOf3Or5(10)).toBe(true);
  expect(isMultipleOf3Or5(7)).toBe(false);
  expectTypeOf(isMultipleOf3Or5).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(isMultipleOf3Or5).returns.toEqualTypeOf<boolean>();
});

test("問18 isOutOfRange", () => {
  expect(isOutOfRange(11, 1, 10)).toBe(true);
  expect(isOutOfRange(0, 1, 10)).toBe(true);
  expect(isOutOfRange(10, 1, 10)).toBe(false);
  expectTypeOf(isOutOfRange).parameters.toEqualTypeOf<[number, number, number]>();
  expectTypeOf(isOutOfRange).returns.toEqualTypeOf<boolean>();
});

test("問19 isValidName", () => {
  expect(isValidName("山田", 10)).toBe(true);
  expect(isValidName("", 10)).toBe(false);
  expect(isValidName("abcdefghijk", 10)).toBe(false);
  expectTypeOf(isValidName).parameters.toEqualTypeOf<[string, number]>();
  expectTypeOf(isValidName).returns.toEqualTypeOf<boolean>();
});

test("問20 isOpen", () => {
  expect(isOpen(9, false)).toBe(true);
  expect(isOpen(18, false)).toBe(false);
  expect(isOpen(9, true)).toBe(false);
  expect(isOpen(14, true)).toBe(true);
  expectTypeOf(isOpen).parameters.toEqualTypeOf<[number, boolean]>();
  expectTypeOf(isOpen).returns.toEqualTypeOf<boolean>();
});
