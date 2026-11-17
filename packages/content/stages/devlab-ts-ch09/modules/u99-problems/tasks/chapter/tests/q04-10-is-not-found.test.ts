// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { isNotFound, NotFoundError, HttpError } from "../src/q04-10-is-not-found";
test("問10 isNotFound", () => {
  expect(isNotFound(new NotFoundError("ユーザー"))).toBe(true);
  expect(isNotFound(new HttpError(404, "x"))).toBe(true);
  expect(isNotFound(new HttpError(500, "x"))).toBe(false);
  expect(isNotFound(new Error("x"))).toBe(false);
  expectTypeOf(isNotFound).parameters.toEqualTypeOf<[unknown]>();
  expectTypeOf(isNotFound).returns.toEqualTypeOf<boolean>();
});
