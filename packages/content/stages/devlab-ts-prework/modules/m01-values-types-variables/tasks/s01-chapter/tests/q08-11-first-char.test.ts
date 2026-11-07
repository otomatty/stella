// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { firstChar } from "../src/q08-11-first-char";
test("問11 firstChar", () => {
  expect(firstChar("abc")).toBe("a");
  expectTypeOf(firstChar).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(firstChar).returns.toEqualTypeOf<string>();
});
