// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { repeatText } from "../src/q02-04-repeat-text";
test("問4 repeatText", () => {
  expect(repeatText("ab", 3)).toBe("ababab");
  expect(repeatText("x", 0)).toBe("");
  expectTypeOf(repeatText).parameters.toEqualTypeOf<[string, number]>();
  expectTypeOf(repeatText).returns.toEqualTypeOf<string>();
});
