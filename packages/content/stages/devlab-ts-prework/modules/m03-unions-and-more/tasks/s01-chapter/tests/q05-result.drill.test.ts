// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import {
  type Result,
  success,
  failure,
  isOk,
  valueOr,
  errorOr,
  safeDivide,
  safeSqrt,
  parseAge,
  doubleResult,
  addResults,
  countOk,
  firstError,
  sumOk,
  resultText,
  validatePrice,
  parsePercent,
  atLeast,
  allOk,
  combineAll,
  orElse,
} from "../src/q05-result.drill";

test("問1 success", () => {
  expect(success(3)).toEqual({ ok: true, value: 3 });
  expectTypeOf(success).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(success).returns.toEqualTypeOf<Result>();
});

test("問2 failure", () => {
  expect(failure("だめ")).toEqual({ ok: false, error: "だめ" });
  expectTypeOf(failure).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(failure).returns.toEqualTypeOf<Result>();
});

test("問3 isOk", () => {
  expect(isOk({ ok: true, value: 1 })).toBe(true);
  expect(isOk({ ok: false, error: "x" })).toBe(false);
  expectTypeOf(isOk).parameters.toEqualTypeOf<[Result]>();
  expectTypeOf(isOk).returns.toEqualTypeOf<boolean>();
});

test("問4 valueOr", () => {
  expect(valueOr({ ok: true, value: 5 }, 0)).toBe(5);
  expect(valueOr({ ok: false, error: "x" }, 0)).toBe(0);
  expectTypeOf(valueOr).parameters.toEqualTypeOf<[Result, number]>();
  expectTypeOf(valueOr).returns.toEqualTypeOf<number>();
});

test("問5 errorOr", () => {
  expect(errorOr({ ok: false, error: "x" }, "なし")).toBe("x");
  expect(errorOr({ ok: true, value: 1 }, "なし")).toBe("なし");
  expectTypeOf(errorOr).parameters.toEqualTypeOf<[Result, string]>();
  expectTypeOf(errorOr).returns.toEqualTypeOf<string>();
});

test("問6 safeDivide", () => {
  expect(safeDivide(6, 3)).toEqual({ ok: true, value: 2 });
  expect(safeDivide(1, 0)).toEqual({ ok: false, error: "0で割ることはできません" });
  expectTypeOf(safeDivide).parameters.toEqualTypeOf<[number, number]>();
  expectTypeOf(safeDivide).returns.toEqualTypeOf<Result>();
});

test("問7 safeSqrt", () => {
  expect(safeSqrt(9)).toEqual({ ok: true, value: 3 });
  expect(safeSqrt(-1)).toEqual({ ok: false, error: "負の数です" });
  expectTypeOf(safeSqrt).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(safeSqrt).returns.toEqualTypeOf<Result>();
});

test("問8 parseAge", () => {
  expect(parseAge("30")).toEqual({ ok: true, value: 30 });
  expect(parseAge("abc")).toEqual({ ok: false, error: "年齢ではありません: abc" });
  expect(parseAge("1.5")).toEqual({ ok: false, error: "年齢ではありません: 1.5" });
  expect(parseAge("200")).toEqual({ ok: false, error: "年齢ではありません: 200" });
  expect(parseAge("")).toEqual({ ok: false, error: "年齢ではありません: " });
  expectTypeOf(parseAge).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(parseAge).returns.toEqualTypeOf<Result>();
});

test("問9 doubleResult", () => {
  expect(doubleResult({ ok: true, value: 4 })).toEqual({ ok: true, value: 8 });
  expect(doubleResult({ ok: false, error: "x" })).toEqual({ ok: false, error: "x" });
  expectTypeOf(doubleResult).parameters.toEqualTypeOf<[Result]>();
  expectTypeOf(doubleResult).returns.toEqualTypeOf<Result>();
});

test("問10 addResults", () => {
  expect(addResults({ ok: true, value: 1 }, { ok: true, value: 2 })).toEqual({
    ok: true,
    value: 3,
  });
  expect(addResults({ ok: false, error: "a" }, { ok: false, error: "b" })).toEqual({
    ok: false,
    error: "a",
  });
  expect(addResults({ ok: true, value: 1 }, { ok: false, error: "b" })).toEqual({
    ok: false,
    error: "b",
  });
  expectTypeOf(addResults).parameters.toEqualTypeOf<[Result, Result]>();
  expectTypeOf(addResults).returns.toEqualTypeOf<Result>();
});

test("問11 countOk", () => {
  expect(
    countOk([
      { ok: true, value: 1 },
      { ok: false, error: "x" },
      { ok: true, value: 2 },
    ]),
  ).toBe(2);
  expect(countOk([])).toBe(0);
  expectTypeOf(countOk).parameters.toEqualTypeOf<[readonly Result[]]>();
  expectTypeOf(countOk).returns.toEqualTypeOf<number>();
});

test("問12 firstError", () => {
  expect(
    firstError([
      { ok: true, value: 1 },
      { ok: false, error: "x" },
      { ok: false, error: "y" },
    ]),
  ).toBe("x");
  expect(firstError([{ ok: true, value: 1 }])).toBeUndefined();
  expectTypeOf(firstError).parameters.toEqualTypeOf<[readonly Result[]]>();
  expectTypeOf(firstError).returns.toEqualTypeOf<string | undefined>();
});

test("問13 sumOk", () => {
  expect(
    sumOk([
      { ok: true, value: 1 },
      { ok: false, error: "x" },
      { ok: true, value: 2 },
    ]),
  ).toBe(3);
  expect(sumOk([])).toBe(0);
  expectTypeOf(sumOk).parameters.toEqualTypeOf<[readonly Result[]]>();
  expectTypeOf(sumOk).returns.toEqualTypeOf<number>();
});

test("問14 resultText", () => {
  expect(resultText({ ok: true, value: 3 })).toBe("成功: 3");
  expect(resultText({ ok: false, error: "だめ" })).toBe("失敗: だめ");
  expectTypeOf(resultText).parameters.toEqualTypeOf<[Result]>();
  expectTypeOf(resultText).returns.toEqualTypeOf<string>();
});

test("問15 validatePrice", () => {
  expect(validatePrice(100)).toEqual({ ok: true, value: 100 });
  expect(validatePrice(-1)).toEqual({ ok: false, error: "価格は0以上にしてください" });
  expect(validatePrice(1.5)).toEqual({ ok: false, error: "価格は整数にしてください" });
  expectTypeOf(validatePrice).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(validatePrice).returns.toEqualTypeOf<Result>();
});

test("問16 parsePercent", () => {
  expect(parsePercent("50%")).toEqual({ ok: true, value: 50 });
  expect(parsePercent("12.5%")).toEqual({ ok: true, value: 12.5 });
  expect(parsePercent("50")).toEqual({ ok: false, error: "割合ではありません: 50" });
  expect(parsePercent("abc%")).toEqual({ ok: false, error: "割合ではありません: abc%" });
  expect(parsePercent("%")).toEqual({ ok: false, error: "割合ではありません: %" });
  expectTypeOf(parsePercent).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(parsePercent).returns.toEqualTypeOf<Result>();
});

test("問17 atLeast", () => {
  expect(atLeast({ ok: true, value: 3 }, 5)).toEqual({ ok: false, error: "5未満です" });
  expect(atLeast({ ok: true, value: 7 }, 5)).toEqual({ ok: true, value: 7 });
  expect(atLeast({ ok: false, error: "x" }, 5)).toEqual({ ok: false, error: "x" });
  expectTypeOf(atLeast).parameters.toEqualTypeOf<[Result, number]>();
  expectTypeOf(atLeast).returns.toEqualTypeOf<Result>();
});

test("問18 allOk", () => {
  expect(
    allOk([
      { ok: true, value: 1 },
      { ok: true, value: 2 },
    ]),
  ).toBe(true);
  expect(
    allOk([
      { ok: true, value: 1 },
      { ok: false, error: "x" },
    ]),
  ).toBe(false);
  expect(allOk([])).toBe(true);
  expectTypeOf(allOk).parameters.toEqualTypeOf<[readonly Result[]]>();
  expectTypeOf(allOk).returns.toEqualTypeOf<boolean>();
});

test("問19 combineAll", () => {
  expect(
    combineAll([
      { ok: true, value: 1 },
      { ok: true, value: 2 },
    ]),
  ).toEqual({ ok: true, value: 3 });
  expect(
    combineAll([
      { ok: true, value: 1 },
      { ok: false, error: "x" },
      { ok: false, error: "y" },
    ]),
  ).toEqual({
    ok: false,
    error: "x",
  });
  expect(combineAll([])).toEqual({ ok: true, value: 0 });
  expectTypeOf(combineAll).parameters.toEqualTypeOf<[readonly Result[]]>();
  expectTypeOf(combineAll).returns.toEqualTypeOf<Result>();
});

test("問20 orElse", () => {
  expect(orElse({ ok: true, value: 1 }, { ok: true, value: 2 })).toEqual({ ok: true, value: 1 });
  expect(orElse({ ok: false, error: "x" }, { ok: true, value: 2 })).toEqual({ ok: true, value: 2 });
  expectTypeOf(orElse).parameters.toEqualTypeOf<[Result, Result]>();
  expectTypeOf(orElse).returns.toEqualTypeOf<Result>();
});
