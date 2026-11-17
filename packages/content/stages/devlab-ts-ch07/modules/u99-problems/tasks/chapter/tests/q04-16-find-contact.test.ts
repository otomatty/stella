// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { findContact, type User } from "../src/q04-16-find-contact";
test("問16 findContact", () => {
  const users: User[] = [{ id: 1, name: "山田", email: "y@example.com", password: "x", age: 30 }];
  expect(findContact(users, 1)).toStrictEqual({ name: "山田", email: "y@example.com" });
  expect(findContact(users, 2)).toBeUndefined();
  expectTypeOf(findContact).parameters.toEqualTypeOf<[readonly User[], number]>();
  expectTypeOf(findContact).returns.toEqualTypeOf<Pick<User, "name" | "email"> | undefined>();
});
