// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { isVowel } from "../src/q06-06-is-vowel";
test("問6 isVowel", () => {
  expect(isVowel("a")).toBe(true);
  expect(isVowel("E")).toBe(true);
  expect(isVowel("b")).toBe(false);
  expect(isVowel("ae")).toBe(false);
  expectTypeOf(isVowel).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(isVowel).returns.toEqualTypeOf<boolean>();
});
