// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { maxBy } from "../src/q07-08-max-by";
test("問8 maxBy", () => {
  const words: string[] = ["a", "abc", "ab"];
  expect(maxBy(words, (s) => s.length)).toBe("abc");
  expectTypeOf(maxBy(words, (s) => s.length)).toEqualTypeOf<string | undefined>();
});
