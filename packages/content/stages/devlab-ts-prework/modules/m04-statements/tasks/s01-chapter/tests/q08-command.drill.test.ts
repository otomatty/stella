// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import {
  parseKeyValue,
  parseNumberList,
  parseYesNo,
  parseClock,
  parseDateParts,
  parseByteSize,
  parseSeconds,
  parseRange,
  parseHexColor,
  parseRatio,
  parseQuery,
  parseCsvLine,
  parseVersion,
  compareVersions,
  parseOperator,
  evaluate,
  commandName,
  commandArgs,
  tryParseInt,
  nonEmptyLines,
} from "../src/q08-command.drill";

test("問1 parseKeyValue", () => {
  expect(parseKeyValue("a=1")).toEqual(["a", "1"]);
  expect(parseKeyValue("url=a=b")).toEqual(["url", "a=b"]);
  expect(() => parseKeyValue("abc")).toThrow("= がありません: abc");
  expectTypeOf(parseKeyValue).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(parseKeyValue).returns.toEqualTypeOf<[string, string]>();
});

test("問2 parseNumberList", () => {
  expect(parseNumberList("1, 2,3")).toEqual([1, 2, 3]);
  expect(() => parseNumberList("1,x,3")).toThrow("数値ではありません: x");
  expectTypeOf(parseNumberList).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(parseNumberList).returns.toEqualTypeOf<number[]>();
});

test("問3 parseYesNo", () => {
  expect(parseYesNo("YES")).toBe(true);
  expect(parseYesNo("0")).toBe(false);
  expect(() => parseYesNo("maybe")).toThrow("真偽値ではありません: maybe");
  expectTypeOf(parseYesNo).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(parseYesNo).returns.toEqualTypeOf<boolean>();
});

test("問4 parseClock", () => {
  expect(parseClock("09:30")).toBe(570);
  expect(parseClock("0:00")).toBe(0);
  expect(() => parseClock("24:00")).toThrow("時刻ではありません: 24:00");
  expect(() => parseClock("12")).toThrow("時刻ではありません: 12");
  expectTypeOf(parseClock).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(parseClock).returns.toEqualTypeOf<number>();
});

test("問5 parseDateParts", () => {
  expect(parseDateParts("2026-12-01")).toEqual([2026, 12, 1]);
  expect(() => parseDateParts("2026/12/01")).toThrow("日付ではありません: 2026/12/01");
  expect(() => parseDateParts("2026-12-xx")).toThrow("日付ではありません: 2026-12-xx");
  expectTypeOf(parseDateParts).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(parseDateParts).returns.toEqualTypeOf<[number, number, number]>();
});

test("問6 parseByteSize", () => {
  expect(parseByteSize("5B")).toBe(5);
  expect(parseByteSize("2KB")).toBe(2048);
  expect(parseByteSize("1MB")).toBe(1048576);
  expect(() => parseByteSize("3GB")).toThrow("大きさではありません: 3GB");
  expectTypeOf(parseByteSize).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(parseByteSize).returns.toEqualTypeOf<number>();
});

test("問7 parseSeconds", () => {
  expect(parseSeconds("90s")).toBe(90);
  expect(parseSeconds("5m")).toBe(300);
  expect(parseSeconds("2h")).toBe(7200);
  expect(() => parseSeconds("3d")).toThrow("時間ではありません: 3d");
  expect(() => parseSeconds("xm")).toThrow("時間ではありません: xm");
  expectTypeOf(parseSeconds).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(parseSeconds).returns.toEqualTypeOf<number>();
});

test("問8 parseRange", () => {
  expect(parseRange("3-7")).toEqual([3, 7]);
  expect(() => parseRange("7-3")).toThrow("範囲ではありません: 7-3");
  expect(() => parseRange("a-b")).toThrow("範囲ではありません: a-b");
  expectTypeOf(parseRange).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(parseRange).returns.toEqualTypeOf<[number, number]>();
});

test("問9 parseHexColor", () => {
  expect(parseHexColor("#ff0000")).toEqual([255, 0, 0]);
  expect(parseHexColor("#00ff80")).toEqual([0, 255, 128]);
  expect(() => parseHexColor("ff0000")).toThrow("色ではありません: ff0000");
  expectTypeOf(parseHexColor).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(parseHexColor).returns.toEqualTypeOf<[number, number, number]>();
});

test("問10 parseRatio", () => {
  expect(parseRatio("50%")).toBe(0.5);
  expect(parseRatio("100%")).toBe(1);
  expect(() => parseRatio("50")).toThrow("割合ではありません: 50");
  expectTypeOf(parseRatio).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(parseRatio).returns.toEqualTypeOf<number>();
});

test("問11 parseQuery", () => {
  expect(parseQuery("a=1&b=2")).toEqual({ a: "1", b: "2" });
  expect(parseQuery("flag&x=y")).toEqual({ flag: "", x: "y" });
  expect(parseQuery("")).toEqual({});
  expectTypeOf(parseQuery).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(parseQuery).returns.toEqualTypeOf<{ [key: string]: string }>();
});

test("問12 parseCsvLine", () => {
  expect(parseCsvLine("a, b ,c")).toEqual(["a", "b", "c"]);
  expect(parseCsvLine("x")).toEqual(["x"]);
  expectTypeOf(parseCsvLine).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(parseCsvLine).returns.toEqualTypeOf<string[]>();
});

test("問13 parseVersion", () => {
  expect(parseVersion("1.12.0")).toEqual([1, 12, 0]);
  expect(() => parseVersion("1.2")).toThrow("バージョンではありません: 1.2");
  expectTypeOf(parseVersion).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(parseVersion).returns.toEqualTypeOf<[number, number, number]>();
});

test("問14 compareVersions", () => {
  expect(compareVersions("1.9.0", "1.10.0")).toBe(-1);
  expect(compareVersions("2.0.0", "1.99.99")).toBe(1);
  expect(compareVersions("1.2.3", "1.2.3")).toBe(0);
  expectTypeOf(compareVersions).parameters.toEqualTypeOf<[string, string]>();
  expectTypeOf(compareVersions).returns.toEqualTypeOf<-1 | 0 | 1>();
});

test("問15 parseOperator", () => {
  expect(parseOperator("*")).toBe("*");
  expect(() => parseOperator("%")).toThrow("演算子ではありません: %");
  expectTypeOf(parseOperator).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(parseOperator).returns.toEqualTypeOf<"+" | "-" | "*" | "/">();
});

test("問16 evaluate", () => {
  expect(evaluate("3 + 4")).toBe(7);
  expect(evaluate(" 6 / 3 ")).toBe(2);
  expect(() => evaluate("6 / 0")).toThrow("0で割ることはできません");
  expect(() => evaluate("6 ^ 2")).toThrow("式ではありません: 6 ^ 2");
  expect(() => evaluate("x + 1")).toThrow("式ではありません: x + 1");
  expectTypeOf(evaluate).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(evaluate).returns.toEqualTypeOf<number>();
});

test("問17 commandName", () => {
  expect(commandName("  ADD 1 2")).toBe("add");
  expect(commandName("help")).toBe("help");
  expect(() => commandName("   ")).toThrow("コマンドがありません");
  expectTypeOf(commandName).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(commandName).returns.toEqualTypeOf<string>();
});

test("問18 commandArgs", () => {
  expect(commandArgs("add  1   2")).toEqual(["1", "2"]);
  expect(commandArgs("help")).toEqual([]);
  expect(commandArgs("")).toEqual([]);
  expectTypeOf(commandArgs).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(commandArgs).returns.toEqualTypeOf<string[]>();
});

test("問19 tryParseInt", () => {
  expect(tryParseInt("12")).toEqual({ ok: true, value: 12 });
  expect(tryParseInt("1.5")).toEqual({ ok: false, error: "整数ではありません: 1.5" });
  expectTypeOf(tryParseInt).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(tryParseInt).returns.toEqualTypeOf<
    { ok: true; value: number } | { ok: false; error: string }
  >();
});

test("問20 nonEmptyLines", () => {
  expect(nonEmptyLines("a\n\n b \n")).toEqual(["a", "b"]);
  expect(nonEmptyLines("")).toEqual([]);
  expectTypeOf(nonEmptyLines).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(nonEmptyLines).returns.toEqualTypeOf<string[]>();
});
