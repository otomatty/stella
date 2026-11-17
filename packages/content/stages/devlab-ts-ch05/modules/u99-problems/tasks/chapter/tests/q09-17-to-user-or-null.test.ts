// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { toUserOrNull, type User } from "../src/q09-17-to-user-or-null";
test("問17 toUserOrNull", () => {
  expect(toUserOrNull({ name: "山田", age: 30 })).toEqual({ name: "山田", age: 30 });
  expect(toUserOrNull("x")).toBeNull();
  expectTypeOf(toUserOrNull).parameters.toEqualTypeOf<[unknown]>();
  expectTypeOf(toUserOrNull).returns.toEqualTypeOf<User | null>();
});
