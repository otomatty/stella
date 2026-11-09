// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { isEmptyText } from "../src/q03-16-is-empty-text";
test("問16 isEmptyText", () => {
  expect(isEmptyText("")).toBe(true);
  expect(isEmptyText(" ")).toBe(false);
  expectTypeOf(isEmptyText).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(isEmptyText).returns.toEqualTypeOf<boolean>();
});
