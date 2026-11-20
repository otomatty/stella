// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { isAdmin, type User, type Admin } from "../src/q09-08-is-admin";
test("問8 isAdmin", () => {
  expect(isAdmin({ name: "山田", age: 30, role: "admin" })).toBe(true);
  expect(isAdmin({ name: "佐藤", age: 25 })).toBe(false);
  expectTypeOf(isAdmin).parameters.toEqualTypeOf<[User | Admin]>();
  expectTypeOf(isAdmin).guards.toEqualTypeOf<Admin>();
});
