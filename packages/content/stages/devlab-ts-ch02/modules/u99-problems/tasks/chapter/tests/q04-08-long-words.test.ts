// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { longWords } from "../src/q04-08-long-words";
test("問8 longWords", () => {
  expect(longWords(["a", "abc", "abcd"], 3)).toEqual(["abc", "abcd"]);
  expectTypeOf(longWords).parameters.toEqualTypeOf<[readonly string[], number]>();
  expectTypeOf(longWords).returns.toEqualTypeOf<string[]>();
});
