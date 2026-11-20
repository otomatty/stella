// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { isUser, type User } from "../src/q09-07-is-user";
test("問7 isUser", () => {
  expect(isUser({ name: "山田", age: 30 })).toBe(true);
  expect(isUser({ name: "山田" })).toBe(false);
  expect(isUser(null)).toBe(false);
  expectTypeOf(isUser).parameters.toEqualTypeOf<[unknown]>();
  expectTypeOf(isUser).guards.toEqualTypeOf<User>();
});
