// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { sortWords } from "../src/q05-10-sort-words";
test("問10 sortWords", () => {
  const words = ["banana", "cherry", "apple"];
  expect(sortWords(words)).toEqual(["apple", "banana", "cherry"]);
  expect(words).toEqual(["banana", "cherry", "apple"]);
  expectTypeOf(sortWords).parameters.toEqualTypeOf<[readonly string[]]>();
  expectTypeOf(sortWords).returns.toEqualTypeOf<string[]>();
});
