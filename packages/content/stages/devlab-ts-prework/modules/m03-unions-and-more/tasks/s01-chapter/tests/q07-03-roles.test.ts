// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { ROLES } from "../src/q07-03-roles";
test("問3 ROLES", () => {
  expect(ROLES).toEqual(["admin", "editor", "viewer"]);
  expectTypeOf<typeof ROLES>().toEqualTypeOf<readonly ["admin", "editor", "viewer"]>();
});
