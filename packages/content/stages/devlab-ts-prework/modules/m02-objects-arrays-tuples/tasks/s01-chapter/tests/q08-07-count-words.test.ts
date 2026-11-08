// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { countWords } from "../src/q08-07-count-words";
test("問7 countWords", () => {
  expect(countWords(["a", "b", "a"])).toEqual({ a: 2, b: 1 });
  expect(countWords([])).toEqual({});
  expectTypeOf(countWords).parameters.toEqualTypeOf<[readonly string[]]>();
  expectTypeOf(countWords).returns.toEqualTypeOf<{ [word: string]: number }>();
});
