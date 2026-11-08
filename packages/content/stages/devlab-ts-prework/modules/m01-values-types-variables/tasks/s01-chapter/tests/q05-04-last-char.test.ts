// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { lastChar } from "../src/q05-04-last-char";
test("問4 lastChar", () => {
  expect(lastChar("hello")).toBe("o");
  expect(lastChar("")).toBe("");
  expectTypeOf(lastChar).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(lastChar).returns.toEqualTypeOf<string>();
});
