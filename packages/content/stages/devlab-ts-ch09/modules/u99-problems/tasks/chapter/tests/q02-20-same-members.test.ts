// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { sameMembers } from "../src/q02-20-same-members";
test("問20 sameMembers", () => {
  expect(sameMembers(["a", "b", "a"], ["b", "a"])).toBe(true);
  expect(sameMembers(["a", "b"], ["a", "c"])).toBe(false);
  expect(sameMembers(["a"], ["a", "b"])).toBe(false);
  expectTypeOf(sameMembers).parameters.toEqualTypeOf<[string[], string[]]>();
  expectTypeOf(sameMembers).returns.toEqualTypeOf<boolean>();
});
