// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { lastChar } from "../src/q08-20-last-char";
test("問20 lastChar", () => {
  expect(lastChar("abc")).toBe("c");
  expectTypeOf(lastChar).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(lastChar).returns.toEqualTypeOf<string>();
});
