// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { loadedUsers, type User } from "../src/q05-06-loaded-users";
test("問6 loadedUsers", async () => {
  const users = await loadedUsers([1, 9, 2]);
  expect(users.map((u) => u.name)).toEqual(["山田", "佐藤"]);
  expectTypeOf(loadedUsers).returns.toEqualTypeOf<Promise<User[]>>();
});
