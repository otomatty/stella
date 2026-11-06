// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import {
  add,
  greet,
  lengthOf,
  isAdult,
  shout,
  half,
  tidy,
  area,
  priceText,
  isEmpty,
  firstChar,
  sum3,
  repeat,
  larger,
  contains,
  toNumber,
  countLabel,
  roundOff,
  joinNames,
  lastChar,
} from "../src/q08-remove-any.drill";

test("問1 add", () => {
  expect(add(2, 3)).toBe(5);
  expectTypeOf(add).parameters.toEqualTypeOf<[number, number]>();
  expectTypeOf(add).returns.toEqualTypeOf<number>();
});

test("問2 greet", () => {
  expect(greet("山田")).toBe("こんにちは、山田さん");
  expectTypeOf(greet).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(greet).returns.toEqualTypeOf<string>();
});

test("問3 lengthOf", () => {
  expect(lengthOf("abc")).toBe(3);
  expectTypeOf(lengthOf).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(lengthOf).returns.toEqualTypeOf<number>();
});

test("問4 isAdult", () => {
  expect(isAdult(20)).toBe(true);
  expect(isAdult(19)).toBe(false);
  expectTypeOf(isAdult).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(isAdult).returns.toEqualTypeOf<boolean>();
});

test("問5 shout", () => {
  expect(shout("abc")).toBe("ABC");
  expectTypeOf(shout).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(shout).returns.toEqualTypeOf<string>();
});

test("問6 half", () => {
  expect(half(9)).toBe(4.5);
  expectTypeOf(half).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(half).returns.toEqualTypeOf<number>();
});

test("問7 tidy", () => {
  expect(tidy("  hi  ")).toBe("hi");
  expectTypeOf(tidy).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(tidy).returns.toEqualTypeOf<string>();
});

test("問8 area", () => {
  expect(area(3, 4)).toBe(12);
  expectTypeOf(area).parameters.toEqualTypeOf<[number, number]>();
  expectTypeOf(area).returns.toEqualTypeOf<number>();
});

test("問9 priceText", () => {
  expect(priceText(1200)).toBe("1,200円");
  expectTypeOf(priceText).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(priceText).returns.toEqualTypeOf<string>();
});

test("問10 isEmpty", () => {
  expect(isEmpty("")).toBe(true);
  expect(isEmpty("a")).toBe(false);
  expectTypeOf(isEmpty).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(isEmpty).returns.toEqualTypeOf<boolean>();
});

test("問11 firstChar", () => {
  expect(firstChar("abc")).toBe("a");
  expectTypeOf(firstChar).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(firstChar).returns.toEqualTypeOf<string>();
});

test("問12 sum3", () => {
  expect(sum3(1, 2, 3)).toBe(6);
  expectTypeOf(sum3).parameters.toEqualTypeOf<[number, number, number]>();
  expectTypeOf(sum3).returns.toEqualTypeOf<number>();
});

test("問13 repeat", () => {
  expect(repeat("ha", 3)).toBe("hahaha");
  expectTypeOf(repeat).parameters.toEqualTypeOf<[string, number]>();
  expectTypeOf(repeat).returns.toEqualTypeOf<string>();
});

test("問14 larger", () => {
  expect(larger(3, 7)).toBe(7);
  expectTypeOf(larger).parameters.toEqualTypeOf<[number, number]>();
  expectTypeOf(larger).returns.toEqualTypeOf<number>();
});

test("問15 contains", () => {
  expect(contains("TypeScript", "Script")).toBe(true);
  expect(contains("TypeScript", "Java")).toBe(false);
  expectTypeOf(contains).parameters.toEqualTypeOf<[string, string]>();
  expectTypeOf(contains).returns.toEqualTypeOf<boolean>();
});

test("問16 toNumber", () => {
  expect(toNumber("42")).toBe(42);
  expectTypeOf(toNumber).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(toNumber).returns.toEqualTypeOf<number>();
});

test("問17 countLabel", () => {
  expect(countLabel(3)).toBe("3件");
  expectTypeOf(countLabel).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(countLabel).returns.toEqualTypeOf<string>();
});

test("問18 roundOff", () => {
  expect(roundOff(2.6)).toBe(3);
  expectTypeOf(roundOff).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(roundOff).returns.toEqualTypeOf<number>();
});

test("問19 joinNames", () => {
  expect(joinNames("山田", "佐藤")).toBe("山田・佐藤");
  expectTypeOf(joinNames).parameters.toEqualTypeOf<[string, string]>();
  expectTypeOf(joinNames).returns.toEqualTypeOf<string>();
});

test("問20 lastChar", () => {
  expect(lastChar("abc")).toBe("c");
  expectTypeOf(lastChar).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(lastChar).returns.toEqualTypeOf<string>();
});
