// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { roleLabel } from "../src/q01-19-role-label";
test("問19 roleLabel", () => {
  expect(roleLabel("admin")).toBe("管理者");
  expect(roleLabel("member")).toBe("一般");
  expectTypeOf(roleLabel).parameters.toEqualTypeOf<["admin" | "member"]>();
  expectTypeOf(roleLabel).returns.toEqualTypeOf<string>();
});
