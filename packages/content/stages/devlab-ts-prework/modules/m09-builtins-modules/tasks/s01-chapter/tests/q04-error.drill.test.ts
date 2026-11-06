// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import {
  fail,
  errorMessage,
  checkRange,
  requireString,
  parseJsonOrNull,
  errorKind,
  ValidationError,
  TimeoutError,
  httpStatusOf,
  HttpError,
  NotFoundError,
  isNotFound,
  toHttpError,
  statusMessage,
  wrapError,
  rootCause,
  tryOr,
  attempt,
  collectErrors,
  withFinally,
  validateAll,
  errorToJson,
} from "../src/q04-error.drill";

// Error でないものを投げる関数
const throwText = (): number => {
  // eslint-disable-next-line @typescript-eslint/only-throw-error -- Error でないものが投げられる場合を作る
  throw "文字列";
};

test("問1 fail", () => {
  expect(() => fail("失敗")).toThrow("失敗");
  expect(() => fail("x")).toThrow(Error);
  expectTypeOf(fail).parameters.toEqualTypeOf<[string]>();
  expectTypeOf<[ReturnType<typeof fail>]>().toEqualTypeOf<[never]>();
});

test("問2 errorMessage", () => {
  expect(errorMessage(new Error("x"))).toBe("x");
  expect(errorMessage(new TypeError("型"))).toBe("型");
  expect(errorMessage("x")).toBe("不明なエラー");
  expect(errorMessage(null)).toBe("不明なエラー");
  expectTypeOf(errorMessage).parameters.toEqualTypeOf<[unknown]>();
  expectTypeOf(errorMessage).returns.toEqualTypeOf<string>();
});

test("問3 checkRange", () => {
  expect(checkRange(5, 1, 10)).toBe(5);
  expect(checkRange(10, 1, 10)).toBe(10);
  expect(() => checkRange(11, 1, 10)).toThrow(RangeError);
  expect(() => checkRange(0, 1, 10)).toThrow("0 は 1〜10 の範囲外です");
  expectTypeOf(checkRange).parameters.toEqualTypeOf<[number, number, number]>();
  expectTypeOf(checkRange).returns.toEqualTypeOf<number>();
});

test("問4 requireString", () => {
  expect(requireString("a")).toBe("a");
  expect(() => requireString(1)).toThrow(TypeError);
  expect(() => requireString(null)).toThrow("文字列ではありません");
  expectTypeOf(requireString).parameters.toEqualTypeOf<[unknown]>();
  expectTypeOf(requireString).returns.toEqualTypeOf<string>();
});

test("問5 parseJsonOrNull", () => {
  expect(parseJsonOrNull('{"a":1}')).toEqual({ a: 1 });
  expect(parseJsonOrNull("[1, 2]")).toEqual([1, 2]);
  expect(parseJsonOrNull("{a:1}")).toBeNull();
  expect(parseJsonOrNull("")).toBeNull();
  expectTypeOf(parseJsonOrNull).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(parseJsonOrNull).returns.toEqualTypeOf<unknown>();
});

test("問6 errorKind", () => {
  class MyTypeError extends TypeError {}
  expect(errorKind(new TypeError("x"))).toBe("TypeError");
  expect(errorKind(new MyTypeError("x"))).toBe("TypeError");
  expect(errorKind(new RangeError("x"))).toBe("RangeError");
  expect(errorKind(new SyntaxError("x"))).toBe("SyntaxError");
  const fake = new Error("x");
  fake.name = "TypeError";
  expect(errorKind(fake)).toBe("Error");
  expect(errorKind("x")).toBe("unknown");
  expectTypeOf(errorKind).parameters.toEqualTypeOf<[unknown]>();
  expectTypeOf(errorKind).returns.toEqualTypeOf<string>();
});

test("問7 ValidationError", () => {
  const error = new ValidationError("email", "形が違います");
  expect(error).toBeInstanceOf(Error);
  expect(error.field).toBe("email");
  expect(error.message).toBe("形が違います");
  expect(error.name).toBe("ValidationError");
  expect(() => {
    throw error;
  }).toThrow(ValidationError);
  expectTypeOf(ValidationError).constructorParameters.toEqualTypeOf<[string, string]>();
  expectTypeOf(error).toHaveProperty("field").toEqualTypeOf<string>();
});

test("問8 TimeoutError", () => {
  const error = new TimeoutError(500);
  expect(error).toBeInstanceOf(Error);
  expect(error.ms).toBe(500);
  expect(error.message).toBe("500ミリ秒でタイムアウトしました");
  expect(error.name).toBe("TimeoutError");
  expectTypeOf(TimeoutError).constructorParameters.toEqualTypeOf<[number]>();
});

test("問9 httpStatusOf", () => {
  expect(httpStatusOf(new HttpError(500, "サーバーエラー"))).toBe(500);
  expect(httpStatusOf(new NotFoundError("ユーザー"))).toBe(404);
  expect(httpStatusOf(new Error("x"))).toBeUndefined();
  expectTypeOf(httpStatusOf).parameters.toEqualTypeOf<[unknown]>();
  expectTypeOf(httpStatusOf).returns.toEqualTypeOf<number | undefined>();
});

test("問10 isNotFound", () => {
  expect(isNotFound(new NotFoundError("ユーザー"))).toBe(true);
  expect(isNotFound(new HttpError(404, "x"))).toBe(true);
  expect(isNotFound(new HttpError(500, "x"))).toBe(false);
  expect(isNotFound(new Error("x"))).toBe(false);
  expectTypeOf(isNotFound).parameters.toEqualTypeOf<[unknown]>();
  expectTypeOf(isNotFound).returns.toEqualTypeOf<boolean>();
});

test("問11 toHttpError", () => {
  const notFound = toHttpError(404);
  expect(notFound).toBeInstanceOf(NotFoundError);
  expect(notFound.message).toBe("ページ が見つかりません");
  const serverError = toHttpError(500);
  expect(serverError).toBeInstanceOf(HttpError);
  expect(serverError).not.toBeInstanceOf(NotFoundError);
  expect(serverError.message).toBe("HTTP 500");
  expect(serverError.status).toBe(500);
  expectTypeOf(toHttpError).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(toHttpError).returns.toEqualTypeOf<HttpError>();
});

test("問12 statusMessage", () => {
  expect(statusMessage(new NotFoundError("ユーザー"))).toBe("見つかりません");
  expect(statusMessage(new HttpError(503, "x"))).toBe("通信エラー（503）");
  expect(statusMessage(new Error("その他"))).toBe("その他");
  expect(statusMessage(1)).toBe("不明なエラー");
  expectTypeOf(statusMessage).parameters.toEqualTypeOf<[unknown]>();
  expectTypeOf(statusMessage).returns.toEqualTypeOf<string>();
});

test("問13 wrapError", () => {
  const original = new TypeError("型");
  const wrapped = wrapError(original, "保存できません");
  expect(wrapped.message).toBe("保存できません");
  expect(wrapped.cause).toBe(original);
  expectTypeOf(wrapError).parameters.toEqualTypeOf<[unknown, string]>();
  expectTypeOf(wrapError).returns.toEqualTypeOf<Error>();
});

test("問14 rootCause", () => {
  const a = new Error("a");
  const b = new Error("b", { cause: a });
  const c = new Error("c", { cause: b });
  expect(rootCause(c)).toBe(a);
  expect(rootCause(a)).toBe(a);
  expect(rootCause(new Error("x", { cause: "文字列" }))).toBe("文字列");
  expect(rootCause(1)).toBe(1);
  expectTypeOf(rootCause).parameters.toEqualTypeOf<[unknown]>();
  expectTypeOf(rootCause).returns.toEqualTypeOf<unknown>();
});

test("問15 tryOr", () => {
  expect(tryOr(() => 5, 0)).toBe(5);
  expect(tryOr(() => Number(JSON.parse("{")), 0)).toBe(0);
  expect(tryOr(throwText, -1)).toBe(-1);
  expectTypeOf(tryOr).parameters.toEqualTypeOf<[() => number, number]>();
  expectTypeOf(tryOr).returns.toEqualTypeOf<number>();
});

test("問16 attempt", () => {
  expect(attempt(() => 5)).toEqual({ ok: true, value: 5 });
  const original = new RangeError("範囲外");
  const failed = attempt(() => {
    throw original;
  });
  expect(failed).toEqual({ ok: false, error: original });
  const text = attempt(throwText);
  expect(text.ok ? "" : text.error.message).toBe("文字列");
  expectTypeOf(attempt).parameters.toEqualTypeOf<[() => number]>();
  expectTypeOf(attempt).returns.toEqualTypeOf<
    { ok: true; value: number } | { ok: false; error: Error }
  >();
});

test("問17 collectErrors", () => {
  const fns = [
    () => undefined,
    () => {
      throw new Error("a");
    },
    () => {
      throwText();
    },
    () => {
      throw new TypeError("b");
    },
  ];
  expect(collectErrors(fns)).toEqual(["a", "不明なエラー", "b"]);
  expectTypeOf(collectErrors).parameters.toEqualTypeOf<[(() => void)[]]>();
  expectTypeOf(collectErrors).returns.toEqualTypeOf<string[]>();
});

test("問18 withFinally", () => {
  const log: string[] = [];
  expect(withFinally(() => 1, log)).toBe(1);
  expect(() =>
    withFinally(() => {
      throw new Error("x");
    }, log),
  ).toThrow("x");
  expect(log).toEqual(["終了", "終了"]);
  expectTypeOf(withFinally).parameters.toEqualTypeOf<[() => number, string[]]>();
  expectTypeOf(withFinally).returns.toEqualTypeOf<number>();
});

test("問19 validateAll", () => {
  expect(() => {
    validateAll([1, 2, 0]);
  }).not.toThrow();
  let caught: unknown;
  try {
    validateAll([1, -2, 3, -4]);
  } catch (error) {
    caught = error;
  }
  expect(caught).toBeInstanceOf(AggregateError);
  if (caught instanceof AggregateError) {
    expect(caught.message).toBe("負の数があります");
    const errors: readonly unknown[] = caught.errors;
    expect(errors.map((e) => (e instanceof RangeError ? e.message : ""))).toEqual([
      "-2 は負の数です",
      "-4 は負の数です",
    ]);
  }
  expectTypeOf(validateAll).parameters.toEqualTypeOf<[number[]]>();
  expectTypeOf(validateAll).returns.toBeVoid();
});

test("問20 errorToJson", () => {
  expect(errorToJson(new NotFoundError("ユーザー"))).toEqual({
    name: "NotFoundError",
    message: "ユーザー が見つかりません",
  });
  expect(errorToJson(new TypeError("型"))).toEqual({ name: "TypeError", message: "型" });
  expect(errorToJson(42)).toEqual({ name: "Unknown", message: "42" });
  expectTypeOf(errorToJson).parameters.toEqualTypeOf<[unknown]>();
  expectTypeOf(errorToJson).returns.toEqualTypeOf<{ name: string; message: string }>();
});
