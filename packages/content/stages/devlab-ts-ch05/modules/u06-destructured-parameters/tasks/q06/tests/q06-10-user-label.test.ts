// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { userLabel } from "../src/q06-10-user-label";
test("問10 userLabel", () => {
  expect(userLabel({ name: "山田", age: 30 })).toBe("山田（30）");
  expect(userLabel({ name: "山田" })).toBe("山田（?）");
  expectTypeOf(userLabel).parameters.toEqualTypeOf<[{ name: string; age?: number }]>();
  expectTypeOf(userLabel).returns.toEqualTypeOf<string>();
});
