// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { groupItems } from "../src/q08-01-group-items";
test("問1 groupItems", () => {
  const words: string[] = ["ab", "c", "de"];
  expect(groupItems(words, (s) => String(s.length))).toEqual({ "2": ["ab", "de"], "1": ["c"] });
  expectTypeOf(groupItems(words, (s) => s)).toEqualTypeOf<Record<string, string[]>>();
});
