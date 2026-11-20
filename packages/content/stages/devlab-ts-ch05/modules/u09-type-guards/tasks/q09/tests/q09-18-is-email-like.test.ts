// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { isEmailLike } from "../src/q09-18-is-email-like";
test("問18 isEmailLike", () => {
  expect(isEmailLike("a@example.com")).toBe(true);
  expect(isEmailLike("example.com")).toBe(false);
  expect(isEmailLike(1)).toBe(false);
  expectTypeOf(isEmailLike).parameters.toEqualTypeOf<[unknown]>();
  expectTypeOf(isEmailLike).guards.toEqualTypeOf<string>();
});
