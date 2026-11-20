// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { isUserKey } from "../src/q02-12-is-user-key";
test("問12 isUserKey", () => {
  expect(isUserKey("email")).toBe(true);
  expect(isUserKey("password")).toBe(false);
  expectTypeOf(isUserKey).guards.toEqualTypeOf<"id" | "name" | "email" | "age">();
});
