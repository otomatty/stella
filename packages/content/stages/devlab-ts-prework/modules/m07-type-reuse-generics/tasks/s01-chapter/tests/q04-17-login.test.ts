// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { login, type User, type Credentials } from "../src/q04-17-login";
test("問17 login", () => {
  const users: User[] = [{ id: 1, name: "山田", email: "y@example.com", password: "x", age: 30 }];
  expect(login(users, { email: "y@example.com", password: "x" })).toStrictEqual({
    id: 1,
    name: "山田",
    email: "y@example.com",
    age: 30,
  });
  expect(login(users, { email: "y@example.com", password: "ng" })).toBeUndefined();
  expectTypeOf<Credentials>().toEqualTypeOf<{ email: string; password: string }>();
  expectTypeOf(login).parameters.toEqualTypeOf<[readonly User[], Credentials]>();
  expectTypeOf(login).returns.toEqualTypeOf<Omit<User, "password"> | undefined>();
});
