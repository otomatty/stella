// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { nth } from "../src/q06-11-nth";
test("問11 nth", () => {
  const words: string[] = ["a", "b", "c"];
  expect(nth(words, 0)).toBe("a");
  expect(nth(words, -1)).toBe("c");
  expect(nth(words, 5)).toBeUndefined();
  expectTypeOf(nth(words, 0)).toEqualTypeOf<string | undefined>();
});
