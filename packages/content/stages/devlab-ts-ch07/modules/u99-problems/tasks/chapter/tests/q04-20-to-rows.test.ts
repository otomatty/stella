// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { toRows, type User, type UserRow } from "../src/q04-20-to-rows";
test("問20 toRows", () => {
  const users: User[] = [
    { id: 2, name: "佐藤", email: "s@example.com", password: "x", age: 41 },
    { id: 1, name: "山田", email: "y@example.com", password: "y", age: 30 },
  ];
  expect(toRows(users)).toStrictEqual([
    { id: 1, name: "山田", age: 30 },
    { id: 2, name: "佐藤", age: 41 },
  ]);
  expectTypeOf(toRows).parameters.toEqualTypeOf<[readonly User[]]>();
  expectTypeOf(toRows).returns.toEqualTypeOf<UserRow[]>();
});
