// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { firstOf } from "../src/q06-02-first-of";
test("問2 firstOf", () => {
  const nums: number[] = [3, 1];
  const words: string[] = ["a"];
  expect(firstOf(nums)).toBe(3);
  expectTypeOf(firstOf(nums)).toEqualTypeOf<number | undefined>();
  expectTypeOf(firstOf(words)).toEqualTypeOf<string | undefined>();
});
