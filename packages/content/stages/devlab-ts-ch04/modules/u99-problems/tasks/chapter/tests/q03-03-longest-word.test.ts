// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { longestWord } from "../src/q03-03-longest-word";
test("問3 longestWord", () => {
  expect(longestWord(["a", "abc", "ab"])).toBe("abc");
  expect(longestWord(["ab", "cd"])).toBe("ab");
  expect(longestWord([])).toBe("");
  expectTypeOf(longestWord).parameters.toEqualTypeOf<[readonly string[]]>();
  expectTypeOf(longestWord).returns.toEqualTypeOf<string>();
});
