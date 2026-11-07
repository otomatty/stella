// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { userSummary, type User } from "../src/q03-06-user-summary";
test("問6 userSummary", () => {
  expect(userSummary({ id: 1, name: "山田", age: 30, email: "y@example.com" })).toBe("山田（30）");
  expectTypeOf(userSummary).parameters.toEqualTypeOf<[User]>();
  expectTypeOf(userSummary).returns.toEqualTypeOf<string>();
});
