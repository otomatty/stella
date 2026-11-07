// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { sortByNumber } from "../src/q07-12-sort-by-number";
test("問12 sortByNumber", () => {
  const words: string[] = ["ccc", "a", "bb"];
  expect(sortByNumber(words, (s) => s.length)).toEqual(["a", "bb", "ccc"]);
  expectTypeOf(sortByNumber(words, (s) => s.length)).toEqualTypeOf<string[]>();
});
