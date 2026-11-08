// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { isBool } from "../src/q09-03-is-bool";
test("問3 isBool", () => {
  expect(isBool(false)).toBe(true);
  expect(isBool(0)).toBe(false);
  expectTypeOf(isBool).parameters.toEqualTypeOf<[unknown]>();
  expectTypeOf(isBool).guards.toEqualTypeOf<boolean>();
});
