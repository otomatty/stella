// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { requireText } from "../src/q05-20-require-text";
test("問20 requireText", () => {
  expect(requireText("  a ")).toBe("a");
  expect(() => requireText("   ")).toThrow("空です");
  expectTypeOf(requireText).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(requireText).returns.toEqualTypeOf<string>();
});
