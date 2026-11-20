// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { hasAny } from "../src/q02-15-has-any";
test("問15 hasAny", () => {
  const permissions = new Set(["read"]);
  expect(hasAny(permissions, ["write", "read"])).toBe(true);
  expect(hasAny(permissions, ["write"])).toBe(false);
  expectTypeOf(hasAny).parameters.toEqualTypeOf<[Set<string>, string[]]>();
  expectTypeOf(hasAny).returns.toEqualTypeOf<boolean>();
});
