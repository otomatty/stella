// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { differentKeys, type User } from "../src/q02-14-different-keys";
test("問14 differentKeys", () => {
  const a: User = { id: 1, name: "山田", email: "y@example.com", age: 30 };
  expect(differentKeys(a, { ...a, age: 31 })).toEqual(["age"]);
  expect(differentKeys(a, a)).toEqual([]);
  expectTypeOf(differentKeys).parameters.toEqualTypeOf<[User, User]>();
  expectTypeOf(differentKeys).returns.toEqualTypeOf<("id" | "name" | "email" | "age")[]>();
});
