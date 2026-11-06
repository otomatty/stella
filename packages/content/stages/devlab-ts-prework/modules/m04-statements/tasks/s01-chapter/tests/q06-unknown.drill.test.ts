// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import {
  isText,
  lengthOf,
  numberOrZero,
  kindOf,
  toText,
  addIfNumbers,
  isDateValue,
  dateText,
  countStrings,
  onlyNumbers,
  firstText,
  hasName,
  nameOrUnknown,
  isNumberList,
  toBool,
  problemText,
  firstItemLength,
  portOf,
  isPlainObject,
  jsonNumber,
} from "../src/q06-unknown.drill";

test("問1 isText", () => {
  expect(isText("a")).toBe(true);
  expect(isText(1)).toBe(false);
  expectTypeOf(isText).parameters.toEqualTypeOf<[unknown]>();
  expectTypeOf(isText).returns.toEqualTypeOf<boolean>();
});

test("問2 lengthOf", () => {
  expect(lengthOf("abc")).toBe(3);
  expect(lengthOf([1, 2, 3])).toBe(3);
  expect(lengthOf(42)).toBe(0);
  expectTypeOf(lengthOf).parameters.toEqualTypeOf<[unknown]>();
  expectTypeOf(lengthOf).returns.toEqualTypeOf<number>();
});

test("問3 numberOrZero", () => {
  expect(numberOrZero(5)).toBe(5);
  expect(numberOrZero("5")).toBe(0);
  expectTypeOf(numberOrZero).parameters.toEqualTypeOf<[unknown]>();
  expectTypeOf(numberOrZero).returns.toEqualTypeOf<number>();
});

test("問4 kindOf", () => {
  expect(kindOf(null)).toBe("null");
  expect(kindOf([])).toBe("array");
  expect(kindOf("a")).toBe("string");
  expect(kindOf({})).toBe("object");
  expect(kindOf(undefined)).toBe("undefined");
  expectTypeOf(kindOf).parameters.toEqualTypeOf<[unknown]>();
  expectTypeOf(kindOf).returns.toEqualTypeOf<string>();
});

test("問5 toText", () => {
  expect(toText("a")).toBe("a");
  expect(toText(1.5)).toBe("1.5");
  expect(toText(true)).toBe("true");
  expect(toText(null)).toBe("null");
  expect(toText(undefined)).toBe("undefined");
  expect(toText({ a: 1 })).toBe("[object]");
  expectTypeOf(toText).parameters.toEqualTypeOf<[unknown]>();
  expectTypeOf(toText).returns.toEqualTypeOf<string>();
});

test("問6 addIfNumbers", () => {
  expect(addIfNumbers(1, 2)).toBe(3);
  expect(addIfNumbers(1, "2")).toBeNull();
  expectTypeOf(addIfNumbers).parameters.toEqualTypeOf<[unknown, unknown]>();
  expectTypeOf(addIfNumbers).returns.toEqualTypeOf<number | null>();
});

test("問7 isDateValue", () => {
  expect(isDateValue(new Date())).toBe(true);
  expect(isDateValue("2026-12-01")).toBe(false);
  expectTypeOf(isDateValue).parameters.toEqualTypeOf<[unknown]>();
  expectTypeOf(isDateValue).returns.toEqualTypeOf<boolean>();
});

test("問8 dateText", () => {
  expect(dateText(new Date("2026-12-01T09:00:00Z"))).toBe("2026-12-01");
  expect(dateText("2026-12-01")).toBe("日付ではありません");
  expectTypeOf(dateText).parameters.toEqualTypeOf<[unknown]>();
  expectTypeOf(dateText).returns.toEqualTypeOf<string>();
});

test("問9 countStrings", () => {
  expect(countStrings(["a", 1, "b", null])).toBe(2);
  expect(countStrings([])).toBe(0);
  expectTypeOf(countStrings).parameters.toEqualTypeOf<[readonly unknown[]]>();
  expectTypeOf(countStrings).returns.toEqualTypeOf<number>();
});

test("問10 onlyNumbers", () => {
  expect(onlyNumbers([1, "2", 3])).toEqual([1, 3]);
  expect(onlyNumbers([])).toEqual([]);
  expectTypeOf(onlyNumbers).parameters.toEqualTypeOf<[readonly unknown[]]>();
  expectTypeOf(onlyNumbers).returns.toEqualTypeOf<number[]>();
});

test("問11 firstText", () => {
  expect(firstText([1, "a", "b"])).toBe("a");
  expect(firstText([1, 2])).toBeUndefined();
  expectTypeOf(firstText).parameters.toEqualTypeOf<[readonly unknown[]]>();
  expectTypeOf(firstText).returns.toEqualTypeOf<string | undefined>();
});

test("問12 hasName", () => {
  expect(hasName({ name: "山田" })).toBe(true);
  expect(hasName({ name: 1 })).toBe(false);
  expect(hasName(null)).toBe(false);
  expect(hasName("山田")).toBe(false);
  expectTypeOf(hasName).parameters.toEqualTypeOf<[unknown]>();
  expectTypeOf(hasName).returns.toEqualTypeOf<boolean>();
});

test("問13 nameOrUnknown", () => {
  expect(nameOrUnknown({ name: "山田", age: 30 })).toBe("山田");
  expect(nameOrUnknown({})).toBe("不明");
  expect(nameOrUnknown(undefined)).toBe("不明");
  expectTypeOf(nameOrUnknown).parameters.toEqualTypeOf<[unknown]>();
  expectTypeOf(nameOrUnknown).returns.toEqualTypeOf<string>();
});

test("問14 isNumberList", () => {
  expect(isNumberList([1, 2])).toBe(true);
  expect(isNumberList([1, "2"])).toBe(false);
  expect(isNumberList([])).toBe(true);
  expect(isNumberList("12")).toBe(false);
  expectTypeOf(isNumberList).parameters.toEqualTypeOf<[unknown]>();
  expectTypeOf(isNumberList).returns.toEqualTypeOf<boolean>();
});

test("問15 toBool", () => {
  expect(toBool(true)).toBe(true);
  expect(toBool("true")).toBe(true);
  expect(toBool("yes")).toBe(false);
  expect(toBool(1)).toBe(false);
  expectTypeOf(toBool).parameters.toEqualTypeOf<[unknown]>();
  expectTypeOf(toBool).returns.toEqualTypeOf<boolean>();
});

test("問16 problemText", () => {
  expect(problemText(new Error("失敗"))).toBe("失敗");
  expect(problemText("だめ")).toBe("だめ");
  expect(problemText(1)).toBe("エラー");
  expectTypeOf(problemText).parameters.toEqualTypeOf<[unknown]>();
  expectTypeOf(problemText).returns.toEqualTypeOf<string>();
});

test("問17 firstItemLength", () => {
  expect(firstItemLength(["abc", 1])).toBe(3);
  expect(firstItemLength([1, "abc"])).toBe(0);
  expect(firstItemLength("abc")).toBe(0);
  expectTypeOf(firstItemLength).parameters.toEqualTypeOf<[unknown]>();
  expectTypeOf(firstItemLength).returns.toEqualTypeOf<number>();
});

test("問18 portOf", () => {
  expect(portOf({ port: 8080 })).toBe(8080);
  expect(portOf({ port: "8080" })).toBe(3000);
  expect(portOf(null)).toBe(3000);
  expectTypeOf(portOf).parameters.toEqualTypeOf<[unknown]>();
  expectTypeOf(portOf).returns.toEqualTypeOf<number>();
});

test("問19 isPlainObject", () => {
  expect(isPlainObject({})).toBe(true);
  expect(isPlainObject([])).toBe(false);
  expect(isPlainObject(null)).toBe(false);
  expect(isPlainObject("a")).toBe(false);
  expectTypeOf(isPlainObject).parameters.toEqualTypeOf<[unknown]>();
  expectTypeOf(isPlainObject).returns.toEqualTypeOf<boolean>();
});

test("問20 jsonNumber", () => {
  expect(jsonNumber("42")).toBe(42);
  expect(jsonNumber('"42"')).toBeNull();
  expect(jsonNumber("{")).toBeNull();
  expectTypeOf(jsonNumber).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(jsonNumber).returns.toEqualTypeOf<number | null>();
});
