// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { pickIdName, type User } from "../src/q03-09-pick-id-name";
test("問9 pickIdName", () => {
  expect(pickIdName({ id: 1, name: "山田", age: 30, email: "y@example.com" })).toEqual({
    id: 1,
    name: "山田",
  });
  expectTypeOf(pickIdName).parameters.toEqualTypeOf<[User]>();
  expectTypeOf(pickIdName).returns.toEqualTypeOf<{ id: number; name: string }>();
});
