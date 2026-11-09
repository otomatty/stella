// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { uniqueChars } from "../src/q02-05-unique-chars";
test("問5 uniqueChars", () => {
  expect(uniqueChars("banana")).toBe("ban");
  expect(uniqueChars("")).toBe("");
  expectTypeOf(uniqueChars).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(uniqueChars).returns.toEqualTypeOf<string>();
});
