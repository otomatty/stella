// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { tagText } from "../src/q03-12-tag-text";
test("問12 tagText", () => {
  expect(tagText("重要", "red")).toBe("<重要:red>");
  expect(tagText("メモ")).toBe("<メモ>");
  expectTypeOf(tagText).parameters.toEqualTypeOf<[string, string?]>();
  expectTypeOf(tagText).returns.toEqualTypeOf<string>();
});
