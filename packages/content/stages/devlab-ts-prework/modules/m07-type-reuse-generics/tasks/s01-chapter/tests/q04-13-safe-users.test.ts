// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { safeUsers, type User } from "../src/q04-13-safe-users";
test("問13 safeUsers", () => {
  const users: User[] = [{ id: 1, name: "山田", email: "y@example.com", password: "x", age: 30 }];
  expect(safeUsers(users)).toStrictEqual([
    { id: 1, name: "山田", email: "y@example.com", age: 30 },
  ]);
  expectTypeOf(safeUsers).parameters.toEqualTypeOf<[readonly User[]]>();
  expectTypeOf(safeUsers).returns.toEqualTypeOf<Omit<User, "password">[]>();
});
