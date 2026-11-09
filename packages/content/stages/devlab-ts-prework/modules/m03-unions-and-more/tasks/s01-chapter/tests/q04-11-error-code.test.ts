// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { errorCode, type Notice } from "../src/q04-11-error-code";
test("問11 errorCode", () => {
  expect(errorCode({ type: "error", message: "x", code: 404 })).toBe(404);
  expect(errorCode({ type: "info", message: "x" })).toBeUndefined();
  expectTypeOf(errorCode).parameters.toEqualTypeOf<[Notice]>();
  expectTypeOf(errorCode).returns.toEqualTypeOf<number | undefined>();
});
