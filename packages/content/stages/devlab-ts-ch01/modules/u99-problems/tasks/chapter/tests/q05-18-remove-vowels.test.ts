// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { removeVowels } from "../src/q05-18-remove-vowels";
test("問18 removeVowels", () => {
  expect(removeVowels("typescript")).toBe("typscrpt");
  expect(removeVowels("aeiou")).toBe("");
  expectTypeOf(removeVowels).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(removeVowels).returns.toEqualTypeOf<string>();
});
