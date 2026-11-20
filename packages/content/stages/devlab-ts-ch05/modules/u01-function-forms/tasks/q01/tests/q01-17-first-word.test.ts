// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { firstWord } from "../src/q01-17-first-word";
test("問17 firstWord", () => {
  expect(firstWord("hello world")).toBe("hello");
  expect(firstWord("single")).toBe("single");
  expectTypeOf(firstWord).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(firstWord).returns.toEqualTypeOf<string>();
});
