// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { uniqueById, type User } from "../src/q02-18-unique-by-id";
test("問18 uniqueById", () => {
  const users: User[] = [
    { id: 1, name: "山田" },
    { id: 2, name: "佐藤" },
    { id: 1, name: "山田（重複）" },
  ];
  expect(uniqueById(users).map((u) => u.name)).toEqual(["山田", "佐藤"]);
  expectTypeOf(uniqueById).parameters.toEqualTypeOf<[User[]]>();
  expectTypeOf(uniqueById).returns.toEqualTypeOf<User[]>();
});
