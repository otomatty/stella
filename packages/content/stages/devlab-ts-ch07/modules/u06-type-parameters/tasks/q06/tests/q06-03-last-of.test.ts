// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { lastOf } from "../src/q06-03-last-of";
test("問3 lastOf", () => {
  const words: string[] = ["a", "b"];
  const empty: number[] = [];
  expect(lastOf(words)).toBe("b");
  expect(lastOf(empty)).toBeUndefined();
  expectTypeOf(lastOf(words)).toEqualTypeOf<string | undefined>();
  expectTypeOf(lastOf(empty)).toEqualTypeOf<number | undefined>();
});
