// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import {
  type Notice,
  type Payment,
  type Shape,
  shapeArea,
  shapeName,
  shapePerimeter,
  isRound,
  scaleShape,
  paymentLabel,
  needsConfirmation,
  lastFour,
  noticeText,
  isSerious,
  errorCode,
  type Animal,
  cry,
  type Vehicle,
  capacity,
  type UserAction,
  actionText,
  type Media,
  mediaInfo,
  type ApiResponse,
  responseText,
  type Account,
  accountText,
  type Token,
  tokenText,
  type Contact,
  contactText,
  type Reading,
  toCelsius,
} from "../src/q04-discriminated-union.drill";

test("問1 shapeArea", () => {
  expect(shapeArea({ kind: "circle", radius: 1 })).toBeCloseTo(Math.PI);
  expect(shapeArea({ kind: "square", size: 3 })).toBe(9);
  expect(shapeArea({ kind: "rect", width: 2, height: 5 })).toBe(10);
  expectTypeOf(shapeArea).parameters.toEqualTypeOf<[Shape]>();
  expectTypeOf(shapeArea).returns.toEqualTypeOf<number>();
});

test("問2 shapeName", () => {
  expect(shapeName({ kind: "circle", radius: 1 })).toBe("円");
  expect(shapeName({ kind: "square", size: 1 })).toBe("正方形");
  expect(shapeName({ kind: "rect", width: 1, height: 2 })).toBe("長方形");
  expectTypeOf(shapeName).parameters.toEqualTypeOf<[Shape]>();
  expectTypeOf(shapeName).returns.toEqualTypeOf<"円" | "正方形" | "長方形">();
});

test("問3 shapePerimeter", () => {
  expect(shapePerimeter({ kind: "circle", radius: 1 })).toBeCloseTo(2 * Math.PI);
  expect(shapePerimeter({ kind: "square", size: 3 })).toBe(12);
  expect(shapePerimeter({ kind: "rect", width: 2, height: 3 })).toBe(10);
  expectTypeOf(shapePerimeter).parameters.toEqualTypeOf<[Shape]>();
  expectTypeOf(shapePerimeter).returns.toEqualTypeOf<number>();
});

test("問4 isRound", () => {
  expect(isRound({ kind: "circle", radius: 1 })).toBe(true);
  expect(isRound({ kind: "square", size: 1 })).toBe(false);
  expectTypeOf(isRound).parameters.toEqualTypeOf<[Shape]>();
  expectTypeOf(isRound).returns.toEqualTypeOf<boolean>();
});

test("問5 scaleShape", () => {
  expect(scaleShape({ kind: "circle", radius: 1 }, 3)).toEqual({ kind: "circle", radius: 3 });
  expect(scaleShape({ kind: "square", size: 3 }, 2)).toEqual({ kind: "square", size: 6 });
  expect(scaleShape({ kind: "rect", width: 1, height: 2 }, 2)).toEqual({
    kind: "rect",
    width: 2,
    height: 4,
  });
  expectTypeOf(scaleShape).parameters.toEqualTypeOf<[Shape, number]>();
  expectTypeOf(scaleShape).returns.toEqualTypeOf<Shape>();
});

test("問6 paymentLabel", () => {
  expect(paymentLabel({ method: "cash" })).toBe("現金");
  expect(paymentLabel({ method: "card", cardNumber: "4111111111111234" })).toBe(
    "カード（末尾1234）",
  );
  expect(paymentLabel({ method: "bank", bankName: "みらい銀行" })).toBe("振込（みらい銀行）");
  expectTypeOf(paymentLabel).parameters.toEqualTypeOf<[Payment]>();
  expectTypeOf(paymentLabel).returns.toEqualTypeOf<string>();
});

test("問7 needsConfirmation", () => {
  expect(needsConfirmation({ method: "cash" })).toBe(false);
  expect(needsConfirmation({ method: "bank", bankName: "みらい銀行" })).toBe(true);
  expectTypeOf(needsConfirmation).parameters.toEqualTypeOf<[Payment]>();
  expectTypeOf(needsConfirmation).returns.toEqualTypeOf<boolean>();
});

test("問8 lastFour", () => {
  expect(lastFour({ method: "card", cardNumber: "4111111111111234" })).toBe("1234");
  expect(lastFour({ method: "cash" })).toBeUndefined();
  expectTypeOf(lastFour).parameters.toEqualTypeOf<[Payment]>();
  expectTypeOf(lastFour).returns.toEqualTypeOf<string | undefined>();
});

test("問9 noticeText", () => {
  expect(noticeText({ type: "info", message: "更新しました" })).toBe("[情報] 更新しました");
  expect(noticeText({ type: "warning", message: "容量が少ない", level: 2 })).toBe(
    "[注意Lv2] 容量が少ない",
  );
  expect(noticeText({ type: "error", message: "失敗", code: 500 })).toBe("[エラー500] 失敗");
  expectTypeOf(noticeText).parameters.toEqualTypeOf<[Notice]>();
  expectTypeOf(noticeText).returns.toEqualTypeOf<string>();
});

test("問10 isSerious", () => {
  expect(isSerious({ type: "info", message: "x" })).toBe(false);
  expect(isSerious({ type: "warning", message: "x", level: 2 })).toBe(false);
  expect(isSerious({ type: "warning", message: "x", level: 3 })).toBe(true);
  expect(isSerious({ type: "error", message: "x", code: 500 })).toBe(true);
  expectTypeOf(isSerious).parameters.toEqualTypeOf<[Notice]>();
  expectTypeOf(isSerious).returns.toEqualTypeOf<boolean>();
});

test("問11 errorCode", () => {
  expect(errorCode({ type: "error", message: "x", code: 404 })).toBe(404);
  expect(errorCode({ type: "info", message: "x" })).toBeUndefined();
  expectTypeOf(errorCode).parameters.toEqualTypeOf<[Notice]>();
  expectTypeOf(errorCode).returns.toEqualTypeOf<number | undefined>();
});

test("問12 cry", () => {
  expectTypeOf<Animal>().toEqualTypeOf<
    { kind: "dog"; name: string } | { kind: "cat"; name: string }
  >();
  expect(cry({ kind: "dog", name: "ポチ" })).toBe("ポチ: ワン");
  expect(cry({ kind: "cat", name: "ミケ" })).toBe("ミケ: ニャー");
  expectTypeOf(cry).parameters.toEqualTypeOf<[Animal]>();
  expectTypeOf(cry).returns.toEqualTypeOf<string>();
});

test("問13 capacity", () => {
  expectTypeOf<Vehicle>().toEqualTypeOf<{ type: "car"; seats: number } | { type: "bike" }>();
  expect(capacity({ type: "car", seats: 5 })).toBe(5);
  expect(capacity({ type: "bike" })).toBe(1);
  expectTypeOf(capacity).parameters.toEqualTypeOf<[Vehicle]>();
  expectTypeOf(capacity).returns.toEqualTypeOf<number>();
});

test("問14 actionText", () => {
  expectTypeOf<UserAction>().toEqualTypeOf<
    { kind: "click"; x: number; y: number } | { kind: "key"; key: string }
  >();
  expect(actionText({ kind: "click", x: 10, y: 20 })).toBe("click(10, 20)");
  expect(actionText({ kind: "key", key: "Enter" })).toBe("key(Enter)");
  expectTypeOf(actionText).parameters.toEqualTypeOf<[UserAction]>();
  expectTypeOf(actionText).returns.toEqualTypeOf<string>();
});

test("問15 mediaInfo", () => {
  expectTypeOf<Media>().toEqualTypeOf<
    { type: "image"; width: number; height: number } | { type: "video"; seconds: number }
  >();
  expect(mediaInfo({ type: "image", width: 100, height: 200 })).toBe("画像 100×200");
  expect(mediaInfo({ type: "video", seconds: 90 })).toBe("動画 90秒");
  expectTypeOf(mediaInfo).parameters.toEqualTypeOf<[Media]>();
  expectTypeOf(mediaInfo).returns.toEqualTypeOf<string>();
});

test("問16 responseText", () => {
  expectTypeOf<ApiResponse>().toEqualTypeOf<
    { ok: true; data: string } | { ok: false; status: number }
  >();
  expect(responseText({ ok: true, data: "こんにちは" })).toBe("こんにちは");
  expect(responseText({ ok: false, status: 404 })).toBe("エラー 404");
  expectTypeOf(responseText).parameters.toEqualTypeOf<[ApiResponse]>();
  expectTypeOf(responseText).returns.toEqualTypeOf<string>();
});

test("問17 accountText", () => {
  expectTypeOf<Account>().toEqualTypeOf<{ plan: "free" } | { plan: "paid"; until: string }>();
  expect(accountText({ plan: "free" })).toBe("無料");
  expect(accountText({ plan: "paid", until: "2026-12-31" })).toBe("有料（2026-12-31まで）");
  expectTypeOf(accountText).parameters.toEqualTypeOf<[Account]>();
  expectTypeOf(accountText).returns.toEqualTypeOf<string>();
});

test("問18 tokenText", () => {
  expectTypeOf<Token>().toEqualTypeOf<
    { type: "number"; value: number } | { type: "plus" } | { type: "minus" }
  >();
  expect(tokenText({ type: "number", value: 3 })).toBe("3");
  expect(tokenText({ type: "plus" })).toBe("+");
  expect(tokenText({ type: "minus" })).toBe("-");
  expectTypeOf(tokenText).parameters.toEqualTypeOf<[Token]>();
  expectTypeOf(tokenText).returns.toEqualTypeOf<string>();
});

test("問19 contactText", () => {
  expectTypeOf<Contact>().toEqualTypeOf<
    { by: "email"; address: string } | { by: "phone"; number: string }
  >();
  expect(contactText({ by: "email", address: "a@example.com" })).toBe("メール: a@example.com");
  expect(contactText({ by: "phone", number: "090-0000-0000" })).toBe("電話: 090-0000-0000");
  expectTypeOf(contactText).parameters.toEqualTypeOf<[Contact]>();
  expectTypeOf(contactText).returns.toEqualTypeOf<string>();
});

test("問20 toCelsius", () => {
  expectTypeOf<Reading>().toEqualTypeOf<
    { unit: "C"; value: number } | { unit: "F"; value: number }
  >();
  expect(toCelsius({ unit: "F", value: 212 })).toBe(100);
  expect(toCelsius({ unit: "F", value: 98.6 })).toBe(37);
  expect(toCelsius({ unit: "C", value: 25 })).toBe(25);
  expectTypeOf(toCelsius).parameters.toEqualTypeOf<[Reading]>();
  expectTypeOf(toCelsius).returns.toEqualTypeOf<number>();
});
