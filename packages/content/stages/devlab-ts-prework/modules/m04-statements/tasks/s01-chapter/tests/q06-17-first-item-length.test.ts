// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { firstItemLength } from "../src/q06-17-first-item-length";
test("問17 firstItemLength", () => {
  expect(firstItemLength(["abc", 1])).toBe(3);
  expect(firstItemLength([1, "abc"])).toBe(0);
  expect(firstItemLength("abc")).toBe(0);
  expectTypeOf(firstItemLength).parameters.toEqualTypeOf<[unknown]>();
  expectTypeOf(firstItemLength).returns.toEqualTypeOf<number>();
});
