// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { birthday, type User } from "../src/q03-07-birthday";
test("問7 birthday", () => {
  const user: User = { id: 1, name: "山田", age: 30, email: "y@example.com" };
  expect(birthday(user).age).toBe(31);
  expect(user.age).toBe(30);
  expectTypeOf(birthday).parameters.toEqualTypeOf<[User]>();
  expectTypeOf(birthday).returns.toEqualTypeOf<User>();
});
