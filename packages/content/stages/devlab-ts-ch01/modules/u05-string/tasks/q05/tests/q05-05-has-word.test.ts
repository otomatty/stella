// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { hasWord } from "../src/q05-05-has-word";
test("問5 hasWord", () => {
  expect(hasWord("I like TypeScript", "Type")).toBe(true);
  expect(hasWord("I like TypeScript", "Java")).toBe(false);
  expectTypeOf(hasWord).parameters.toEqualTypeOf<[string, string]>();
  expectTypeOf(hasWord).returns.toEqualTypeOf<boolean>();
});
