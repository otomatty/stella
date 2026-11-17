// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { patchUser, type UserPatch, type User } from "../src/q04-14-patch-user";
test("問14 patchUser", () => {
  expectTypeOf<UserPatch>().toEqualTypeOf<{ name?: string; email?: string; age?: number }>();
  const user: User = { id: 1, name: "山田", email: "y@example.com", password: "x", age: 30 };
  expect(patchUser(user, { age: 31 })).toEqual({ ...user, age: 31 });
  expectTypeOf(patchUser).parameters.toEqualTypeOf<[User, UserPatch]>();
  expectTypeOf(patchUser).returns.toEqualTypeOf<User>();
});
