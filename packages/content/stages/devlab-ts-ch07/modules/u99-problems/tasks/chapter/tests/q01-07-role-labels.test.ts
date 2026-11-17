// このファイルは書き換えないでください
import { expectTypeOf, test } from "vitest";
import { type RoleLabels } from "../src/q01-07-role-labels";
test("問7 RoleLabels", () => {
  expectTypeOf<RoleLabels>().toEqualTypeOf<{ readonly admin: "管理者"; readonly member: "一般" }>();
});
