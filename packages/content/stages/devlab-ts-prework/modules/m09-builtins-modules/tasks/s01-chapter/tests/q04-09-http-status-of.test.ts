// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { httpStatusOf, HttpError, NotFoundError } from "../src/q04-09-http-status-of";
test("問9 httpStatusOf", () => {
  expect(httpStatusOf(new HttpError(500, "サーバーエラー"))).toBe(500);
  expect(httpStatusOf(new NotFoundError("ユーザー"))).toBe(404);
  expect(httpStatusOf(new Error("x"))).toBeUndefined();
  expectTypeOf(httpStatusOf).parameters.toEqualTypeOf<[unknown]>();
  expectTypeOf(httpStatusOf).returns.toEqualTypeOf<number | undefined>();
});
