// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { isComplete, type Profile } from "../src/q03-09-is-complete";
test("問9 isComplete", () => {
  expect(isComplete({ name: "山田" })).toBe(false);
  expect(isComplete({ name: "山田", email: "y@example.com", age: 30 })).toBe(true);
  expectTypeOf(isComplete).guards.toEqualTypeOf<Required<Profile>>();
});
