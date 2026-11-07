// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { mergeUser, type User } from "../src/q03-10-merge-user";
test("問10 mergeUser", () => {
  const user: User = { id: 1, name: "山田", age: 30, email: "y@example.com" };
  expect(mergeUser(user, { name: "山田太郎", email: "t@example.com" })).toEqual({
    id: 1,
    name: "山田太郎",
    age: 30,
    email: "t@example.com",
  });
  expect(user.name).toBe("山田");
  expectTypeOf(mergeUser).parameters.toEqualTypeOf<[User, { name: string; email: string }]>();
  expectTypeOf(mergeUser).returns.toEqualTypeOf<User>();
});
