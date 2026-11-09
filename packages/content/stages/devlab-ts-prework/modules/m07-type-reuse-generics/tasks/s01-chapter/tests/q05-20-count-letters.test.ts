// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { countLetters } from "../src/q05-20-count-letters";
test("問20 countLetters", () => {
  expect(countLetters("aab")).toEqual({ a: 2, b: 1 });
  expect(countLetters("")).toEqual({});
  expectTypeOf(countLetters).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(countLetters).returns.toEqualTypeOf<Record<string, number>>();
});
