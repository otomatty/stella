// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import {
  requirePositive,
  divide,
  parseIntStrict,
  itemAt,
  isValidJson,
  isValidUrl,
  hostOf,
  safeRepeat,
  decodeOr,
  messageOf,
  errorName,
  toBigIntOrNull,
  validateUsername,
  checkAge,
  isRangeError,
  readPort,
  countInvalidJson,
  loadSettings,
  checkWithLog,
  requireText,
} from "../src/q05-exception.drill";

test("問1 requirePositive", () => {
  expect(requirePositive(3)).toBe(3);
  expect(() => requirePositive(0)).toThrow("正の数が必要です");
  expectTypeOf(requirePositive).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(requirePositive).returns.toEqualTypeOf<number>();
});

test("問2 divide", () => {
  expect(divide(6, 3)).toBe(2);
  expect(() => divide(1, 0)).toThrow("0で割ることはできません");
  expectTypeOf(divide).parameters.toEqualTypeOf<[number, number]>();
  expectTypeOf(divide).returns.toEqualTypeOf<number>();
});

test("問3 parseIntStrict", () => {
  expect(parseIntStrict("42")).toBe(42);
  expect(parseIntStrict("-12")).toBe(-12);
  expect(() => parseIntStrict("1.5")).toThrow("整数ではありません: 1.5");
  expect(() => parseIntStrict("12px")).toThrow("整数ではありません: 12px");
  expectTypeOf(parseIntStrict).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(parseIntStrict).returns.toEqualTypeOf<number>();
});

test("問4 itemAt", () => {
  expect(itemAt(["a", "b"], 1)).toBe("b");
  expect(() => itemAt(["a", "b"], 2)).toThrow("範囲外です: 2");
  expectTypeOf(itemAt).parameters.toEqualTypeOf<[readonly string[], number]>();
  expectTypeOf(itemAt).returns.toEqualTypeOf<string>();
});

test("問5 isValidJson", () => {
  expect(isValidJson('{"a":1}')).toBe(true);
  expect(isValidJson("[1, 2]")).toBe(true);
  expect(isValidJson("{a:1}")).toBe(false);
  expectTypeOf(isValidJson).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(isValidJson).returns.toEqualTypeOf<boolean>();
});

test("問6 isValidUrl", () => {
  expect(isValidUrl("https://example.com")).toBe(true);
  expect(isValidUrl("example.com")).toBe(false);
  expectTypeOf(isValidUrl).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(isValidUrl).returns.toEqualTypeOf<boolean>();
});

test("問7 hostOf", () => {
  expect(hostOf("https://example.com/path")).toBe("example.com");
  expect(hostOf("not a url")).toBe("");
  expectTypeOf(hostOf).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(hostOf).returns.toEqualTypeOf<string>();
});

test("問8 safeRepeat", () => {
  expect(safeRepeat("ab", 2)).toBe("abab");
  expect(safeRepeat("ab", -1)).toBe("");
  expectTypeOf(safeRepeat).parameters.toEqualTypeOf<[string, number]>();
  expectTypeOf(safeRepeat).returns.toEqualTypeOf<string>();
});

test("問9 decodeOr", () => {
  expect(decodeOr("%E3%81%82", "?")).toBe("あ");
  expect(decodeOr("%", "?")).toBe("?");
  expectTypeOf(decodeOr).parameters.toEqualTypeOf<[string, string]>();
  expectTypeOf(decodeOr).returns.toEqualTypeOf<string>();
});

test("問10 messageOf", () => {
  expect(messageOf(new Error("失敗"))).toBe("失敗");
  expect(messageOf("文字列")).toBe("文字列");
  expect(messageOf(404)).toBe("404");
  expectTypeOf(messageOf).parameters.toEqualTypeOf<[unknown]>();
  expectTypeOf(messageOf).returns.toEqualTypeOf<string>();
});

test("問11 errorName", () => {
  expect(errorName(new Error("x"))).toBe("Error");
  expect(errorName(new RangeError("x"))).toBe("RangeError");
  expect(errorName("x")).toBe("Unknown");
  expectTypeOf(errorName).parameters.toEqualTypeOf<[unknown]>();
  expectTypeOf(errorName).returns.toEqualTypeOf<string>();
});

test("問12 toBigIntOrNull", () => {
  expect(toBigIntOrNull("123")).toBe(123n);
  expect(toBigIntOrNull("1.5")).toBeNull();
  expectTypeOf(toBigIntOrNull).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(toBigIntOrNull).returns.toEqualTypeOf<bigint | null>();
});

test("問13 validateUsername", () => {
  expect(() => {
    validateUsername("");
  }).toThrow("名前を入力してください");
  expect(() => {
    validateUsername("a".repeat(21));
  }).toThrow("20文字以内にしてください");
  expect(() => {
    validateUsername("yamada taro");
  }).toThrow("空白は使えません");
  expect(() => {
    validateUsername("yamada");
  }).not.toThrow();
  expectTypeOf(validateUsername).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(validateUsername).returns.toBeVoid();
});

test("問14 checkAge", () => {
  expect(() => {
    checkAge(200);
  }).toThrow(RangeError);
  expect(() => {
    checkAge(-1);
  }).toThrow(RangeError);
  expect(() => {
    checkAge(30);
  }).not.toThrow();
  expectTypeOf(checkAge).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(checkAge).returns.toBeVoid();
});

test("問15 isRangeError", () => {
  expect(isRangeError(new RangeError("x"))).toBe(true);
  expect(isRangeError(new Error("x"))).toBe(false);
  expect(isRangeError("x")).toBe(false);
  expectTypeOf(isRangeError).parameters.toEqualTypeOf<[unknown]>();
  expectTypeOf(isRangeError).returns.toEqualTypeOf<boolean>();
});

test("問16 readPort", () => {
  expect(readPort('{"port":8080}')).toBe(8080);
  expect(() => readPort('{"port":"8080"}')).toThrow("port がありません");
  expect(() => readPort("{")).toThrow("port がありません");
  expectTypeOf(readPort).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(readPort).returns.toEqualTypeOf<number>();
});

test("問17 countInvalidJson", () => {
  expect(countInvalidJson(["1", "{", "[]", "x"])).toBe(2);
  expect(countInvalidJson([])).toBe(0);
  expectTypeOf(countInvalidJson).parameters.toEqualTypeOf<[readonly string[]]>();
  expectTypeOf(countInvalidJson).returns.toEqualTypeOf<number>();
});

test("問18 loadSettings", () => {
  expect(loadSettings('{"a":1}')).toEqual({ a: 1 });
  expect(() => loadSettings("{")).toThrow("設定を読めません");
  try {
    loadSettings("{");
  } catch (error) {
    expect(error instanceof Error && error.cause instanceof SyntaxError).toBe(true);
  }
  expectTypeOf(loadSettings).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(loadSettings).returns.toEqualTypeOf<unknown>();
});

test("問19 checkWithLog", () => {
  const log: string[] = [];
  expect(checkWithLog(log, "1")).toBe(true);
  expect(checkWithLog(log, "{")).toBe(false);
  expect(log).toEqual(["checked", "checked"]);
  expectTypeOf(checkWithLog).parameters.toEqualTypeOf<[string[], string]>();
  expectTypeOf(checkWithLog).returns.toEqualTypeOf<boolean>();
});

test("問20 requireText", () => {
  expect(requireText("  a ")).toBe("a");
  expect(() => requireText("   ")).toThrow("空です");
  expectTypeOf(requireText).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(requireText).returns.toEqualTypeOf<string>();
});
