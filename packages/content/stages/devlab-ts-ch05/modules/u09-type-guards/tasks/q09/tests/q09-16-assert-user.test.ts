// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { assertUser, type User } from "../src/q09-16-assert-user";
test("問16 assertUser", () => {
  expect(() => {
    assertUser({});
  }).toThrow("User ではありません");
  expect(() => {
    assertUser({ name: "山田", age: 30 });
  }).not.toThrow();
  expectTypeOf(assertUser).parameters.toEqualTypeOf<[unknown]>();
  expectTypeOf(assertUser).asserts.toEqualTypeOf<User>();
});
