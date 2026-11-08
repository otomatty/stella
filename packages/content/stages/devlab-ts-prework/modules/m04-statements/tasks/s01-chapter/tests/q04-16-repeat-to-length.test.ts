// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { repeatToLength } from "../src/q04-16-repeat-to-length";
test("問16 repeatToLength", () => {
  expect(repeatToLength("ab", 5)).toBe("ababa");
  expect(repeatToLength("abc", 3)).toBe("abc");
  expect(repeatToLength("", 3)).toBe("");
  expectTypeOf(repeatToLength).parameters.toEqualTypeOf<[string, number]>();
  expectTypeOf(repeatToLength).returns.toEqualTypeOf<string>();
});
