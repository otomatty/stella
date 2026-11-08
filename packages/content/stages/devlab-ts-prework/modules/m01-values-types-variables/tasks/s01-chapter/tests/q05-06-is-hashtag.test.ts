// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { isHashtag } from "../src/q05-06-is-hashtag";
test("問6 isHashtag", () => {
  expect(isHashtag("#agora")).toBe(true);
  expect(isHashtag("agora#")).toBe(false);
  expectTypeOf(isHashtag).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(isHashtag).returns.toEqualTypeOf<boolean>();
});
