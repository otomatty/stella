// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { minBy } from "../src/q08-20-min-by";
test("問20 minBy", () => {
  const words: string[] = ["abc", "a", "b"];
  expect(minBy(words, (s) => s.length)).toBe("a");
  expectTypeOf(minBy(words, (s) => s.length)).toEqualTypeOf<string | undefined>();
});
