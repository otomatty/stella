// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { chunked } from "../src/q08-06-chunked";
test("問6 chunked", () => {
  const words: string[] = ["a", "b", "c"];
  expect(chunked(words, 2)).toEqual([["a", "b"], ["c"]]);
  expect(() => chunked(words, 0)).toThrow(Error);
  expectTypeOf(chunked(words, 2)).toEqualTypeOf<string[][]>();
});
