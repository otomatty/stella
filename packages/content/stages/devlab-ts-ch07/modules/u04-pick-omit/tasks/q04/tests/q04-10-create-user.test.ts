// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { createUser, type User } from "../src/q04-10-create-user";
test("問10 createUser", () => {
  expect(createUser({ name: "山田", email: "y@example.com", password: "x", age: 30 }, 7)).toEqual({
    id: 7,
    name: "山田",
    email: "y@example.com",
    password: "x",
    age: 30,
  });
  expectTypeOf(createUser).parameters.toEqualTypeOf<[Omit<User, "id">, number]>();
  expectTypeOf(createUser).returns.toEqualTypeOf<User>();
});
