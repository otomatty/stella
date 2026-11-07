// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { charAtOrEmpty } from "../src/q05-19-char-at-or-empty";
test("問19 charAtOrEmpty", () => {
  expect(charAtOrEmpty("abc", 1)).toBe("b");
  expect(charAtOrEmpty("abc", 5)).toBe("");
  expectTypeOf(charAtOrEmpty).parameters.toEqualTypeOf<[string, number]>();
  expectTypeOf(charAtOrEmpty).returns.toEqualTypeOf<string>();
});
