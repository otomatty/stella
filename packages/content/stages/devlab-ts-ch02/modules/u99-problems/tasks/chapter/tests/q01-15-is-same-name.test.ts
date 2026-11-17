// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { isSameName } from "../src/q01-15-is-same-name";
test("問15 isSameName", () => {
  expect(isSameName({ name: "山田" }, { name: "山田" })).toBe(true);
  expect(isSameName({ name: "山田" }, { name: "佐藤" })).toBe(false);
  expectTypeOf(isSameName).parameters.toEqualTypeOf<[{ name: string }, { name: string }]>();
  expectTypeOf(isSameName).returns.toEqualTypeOf<boolean>();
});
