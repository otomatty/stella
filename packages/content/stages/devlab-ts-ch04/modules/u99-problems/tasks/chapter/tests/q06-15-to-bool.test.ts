// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { toBool } from "../src/q06-15-to-bool";
test("問15 toBool", () => {
  expect(toBool(true)).toBe(true);
  expect(toBool("true")).toBe(true);
  expect(toBool("yes")).toBe(false);
  expect(toBool(1)).toBe(false);
  expectTypeOf(toBool).parameters.toEqualTypeOf<[unknown]>();
  expectTypeOf(toBool).returns.toEqualTypeOf<boolean>();
});
