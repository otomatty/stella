// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { countUsers } from "../src/q09-13-count-users";
test("問13 countUsers", () => {
  expect(countUsers([{ name: "山田", age: 30 }, "x", { name: "佐藤" }])).toBe(1);
  expectTypeOf(countUsers).parameters.toEqualTypeOf<[readonly unknown[]]>();
  expectTypeOf(countUsers).returns.toEqualTypeOf<number>();
});
