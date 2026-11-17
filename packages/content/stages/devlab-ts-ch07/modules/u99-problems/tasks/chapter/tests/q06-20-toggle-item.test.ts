// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { toggleItem } from "../src/q06-20-toggle-item";
test("問20 toggleItem", () => {
  const words: string[] = ["a", "b"];
  expect(toggleItem(words, "a")).toEqual(["b"]);
  expect(toggleItem(words, "c")).toEqual(["a", "b", "c"]);
  expectTypeOf(toggleItem(words, "a")).toEqualTypeOf<string[]>();
});
