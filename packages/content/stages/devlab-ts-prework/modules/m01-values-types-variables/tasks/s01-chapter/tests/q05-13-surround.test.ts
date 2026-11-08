// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { surround } from "../src/q05-13-surround";
test("問13 surround", () => {
  expect(surround("注意", "**")).toBe("**注意**");
  expect(surround("x", "")).toBe("x");
  expectTypeOf(surround).parameters.toEqualTypeOf<[string, string]>();
  expectTypeOf(surround).returns.toEqualTypeOf<string>();
});
