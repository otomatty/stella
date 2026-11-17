// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { lastWord } from "../src/q01-14-last-word";
test("問14 lastWord", () => {
  expect(lastWord("hello big world")).toBe("world");
  expect(lastWord("single")).toBe("single");
  expectTypeOf(lastWord).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(lastWord).returns.toEqualTypeOf<string>();
});
