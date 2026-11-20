// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { isPalindrome } from "../src/q05-14-is-palindrome";
test("問14 isPalindrome", () => {
  expect(isPalindrome("level")).toBe(true);
  expect(isPalindrome("しんぶんし")).toBe(true);
  expect(isPalindrome("agora")).toBe(false);
  expectTypeOf(isPalindrome).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(isPalindrome).returns.toEqualTypeOf<boolean>();
});
