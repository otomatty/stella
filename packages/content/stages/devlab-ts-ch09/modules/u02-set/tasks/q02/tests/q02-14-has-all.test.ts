// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { hasAll } from "../src/q02-14-has-all";
test("問14 hasAll", () => {
  const permissions = new Set(["read", "write"]);
  expect(hasAll(permissions, ["read", "write"])).toBe(true);
  expect(hasAll(permissions, ["read", "delete"])).toBe(false);
  expect(hasAll(permissions, [])).toBe(true);
  expectTypeOf(hasAll).parameters.toEqualTypeOf<[Set<string>, string[]]>();
  expectTypeOf(hasAll).returns.toEqualTypeOf<boolean>();
});
