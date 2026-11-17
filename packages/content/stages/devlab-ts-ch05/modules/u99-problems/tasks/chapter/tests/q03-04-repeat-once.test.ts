// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { repeatOnce } from "../src/q03-04-repeat-once";
test("問4 repeatOnce", () => {
  expect(repeatOnce("ab")).toBe("ab");
  expect(repeatOnce("ab", 3)).toBe("ababab");
  expectTypeOf(repeatOnce).parameters.toEqualTypeOf<[string, number?]>();
  expectTypeOf(repeatOnce).returns.toEqualTypeOf<string>();
});
