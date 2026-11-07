// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { uniqueByKey } from "../src/q08-04-unique-by-key";
test("問4 uniqueByKey", () => {
  const words: string[] = ["ab", "cd", "e"];
  expect(uniqueByKey(words, (s) => s.length)).toEqual(["ab", "e"]);
  expectTypeOf(uniqueByKey(words, (s) => s)).toEqualTypeOf<string[]>();
});
