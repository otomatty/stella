// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { commonChars } from "../src/q02-16-common-chars";
test("問16 commonChars", () => {
  expect(commonChars("banana", "cabin")).toBe("ban");
  expect(commonChars("abc", "xyz")).toBe("");
  expectTypeOf(commonChars).parameters.toEqualTypeOf<[string, string]>();
  expectTypeOf(commonChars).returns.toEqualTypeOf<string>();
});
