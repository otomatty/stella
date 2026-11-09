// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { firstChar } from "../src/q03-20-first-char";
test("問20 firstChar", () => {
  expect(firstChar("abc")).toBe("a");
  expect(firstChar("")).toBeUndefined();
  expectTypeOf(firstChar).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(firstChar).returns.toEqualTypeOf<string | undefined>();
});
