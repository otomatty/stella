// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { joinWords } from "../src/q03-11-join-words";
test("問11 joinWords", () => {
  expect(joinWords("Hello", "World")).toBe("Hello World");
  expectTypeOf(joinWords).parameters.toEqualTypeOf<[string, string]>();
  expectTypeOf(joinWords).returns.toEqualTypeOf<string>();
});
