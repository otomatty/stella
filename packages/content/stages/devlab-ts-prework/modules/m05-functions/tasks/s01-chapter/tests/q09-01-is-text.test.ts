// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { isText } from "../src/q09-01-is-text";
test("問1 isText", () => {
  expect(isText("a")).toBe(true);
  expect(isText(1)).toBe(false);
  expectTypeOf(isText).parameters.toEqualTypeOf<[unknown]>();
  expectTypeOf(isText).guards.toEqualTypeOf<string>();
});
