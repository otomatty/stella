// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { makeMember } from "../src/q06-11-make-member";
test("問11 makeMember", () => {
  expect(makeMember({ name: "山田" })).toEqual({ name: "山田", role: "member" });
  expect(makeMember({ name: "佐藤", role: "admin" })).toEqual({ name: "佐藤", role: "admin" });
  expectTypeOf(makeMember).parameters.toEqualTypeOf<
    [{ name: string; role?: "admin" | "member" }]
  >();
  expectTypeOf(makeMember).returns.toEqualTypeOf<{ name: string; role: "admin" | "member" }>();
});
