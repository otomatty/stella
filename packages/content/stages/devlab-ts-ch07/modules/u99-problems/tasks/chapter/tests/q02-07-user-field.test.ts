// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { userField, type User } from "../src/q02-07-user-field";
test("問7 userField", () => {
  const user: User = { id: 1, name: "山田", email: "y@example.com", age: 30 };
  expect(userField(user, "name")).toBe("山田");
  expect(userField(user, "age")).toBe(30);
  expectTypeOf(userField).parameters.toEqualTypeOf<[User, "id" | "name" | "email" | "age"]>();
  expectTypeOf(userField).returns.toEqualTypeOf<string | number>();
});
