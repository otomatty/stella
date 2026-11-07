// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { toSafeUser, type User } from "../src/q04-08-to-safe-user";
test("問8 toSafeUser", () => {
  const user: User = { id: 1, name: "山田", email: "y@example.com", password: "x", age: 30 };
  expect(toSafeUser(user)).toStrictEqual({ id: 1, name: "山田", email: "y@example.com", age: 30 });
  expectTypeOf(toSafeUser).parameters.toEqualTypeOf<[User]>();
  expectTypeOf(toSafeUser).returns.toEqualTypeOf<Omit<User, "password">>();
});
