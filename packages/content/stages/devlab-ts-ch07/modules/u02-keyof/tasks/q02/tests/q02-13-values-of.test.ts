// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { valuesOf, type User } from "../src/q02-13-values-of";
test("問13 valuesOf", () => {
  const user: User = { id: 1, name: "山田", email: "y@example.com", age: 30 };
  expect(valuesOf(user, ["name", "age"])).toEqual(["山田", 30]);
  expect(valuesOf(user, [])).toEqual([]);
  expectTypeOf(valuesOf).parameters.toEqualTypeOf<
    [User, readonly ("id" | "name" | "email" | "age")[]]
  >();
  expectTypeOf(valuesOf).returns.toEqualTypeOf<(string | number)[]>();
});
