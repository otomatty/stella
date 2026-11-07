// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { sortByNumberKey, type User } from "../src/q02-15-sort-by-number-key";
test("問15 sortByNumberKey", () => {
  const users: User[] = [
    { id: 2, name: "佐藤", email: "s@example.com", age: 41 },
    { id: 1, name: "山田", email: "y@example.com", age: 30 },
  ];
  expect(sortByNumberKey(users, "age").map((u) => u.name)).toEqual(["山田", "佐藤"]);
  expect(sortByNumberKey(users, "id").map((u) => u.id)).toEqual([1, 2]);
  expectTypeOf(sortByNumberKey).parameters.toEqualTypeOf<[readonly User[], "id" | "age"]>();
  expectTypeOf(sortByNumberKey).returns.toEqualTypeOf<User[]>();
});
