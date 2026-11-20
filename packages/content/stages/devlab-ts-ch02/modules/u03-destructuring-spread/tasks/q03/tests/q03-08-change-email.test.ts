// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { changeEmail, type User } from "../src/q03-08-change-email";
test("問8 changeEmail", () => {
  const user: User = { id: 1, name: "山田", age: 30, email: "y@example.com" };
  expect(changeEmail(user, "new@example.com")).toEqual({
    id: 1,
    name: "山田",
    age: 30,
    email: "new@example.com",
  });
  expect(user.email).toBe("y@example.com");
  expectTypeOf(changeEmail).parameters.toEqualTypeOf<[User, string]>();
  expectTypeOf(changeEmail).returns.toEqualTypeOf<User>();
});
