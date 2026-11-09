// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { toContact, type User } from "../src/q04-07-to-contact";
test("問7 toContact", () => {
  const user: User = { id: 1, name: "山田", email: "y@example.com", password: "x", age: 30 };
  expect(toContact(user)).toStrictEqual({ name: "山田", email: "y@example.com" });
  expectTypeOf(toContact).parameters.toEqualTypeOf<[User]>();
  expectTypeOf(toContact).returns.toEqualTypeOf<Pick<User, "name" | "email">>();
});
