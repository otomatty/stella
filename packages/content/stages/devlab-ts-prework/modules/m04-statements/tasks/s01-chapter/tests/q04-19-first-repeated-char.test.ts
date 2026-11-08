// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { firstRepeatedChar } from "../src/q04-19-first-repeated-char";
test("問19 firstRepeatedChar", () => {
  expect(firstRepeatedChar("abcbd")).toBe("b");
  expect(firstRepeatedChar("abc")).toBeUndefined();
  expectTypeOf(firstRepeatedChar).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(firstRepeatedChar).returns.toEqualTypeOf<string | undefined>();
});
