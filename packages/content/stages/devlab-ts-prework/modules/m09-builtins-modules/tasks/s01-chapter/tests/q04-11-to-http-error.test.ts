// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { toHttpError, NotFoundError, HttpError } from "../src/q04-11-to-http-error";
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
