// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { pathOf } from "../src/q05-10-path-of";
test("問10 pathOf", () => {
  expect(pathOf("users", "", "42")).toBe("users/42");
  expect(pathOf()).toBe("");
  expectTypeOf(pathOf).parameters.toEqualTypeOf<string[]>();
  expectTypeOf(pathOf).returns.toEqualTypeOf<string>();
});
