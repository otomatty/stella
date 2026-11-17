// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { countSpaces } from "../src/q01-18-count-spaces";
test("問18 countSpaces", () => {
  expect(countSpaces("a b c")).toBe(2);
  expect(countSpaces("abc")).toBe(0);
  expectTypeOf(countSpaces).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(countSpaces).returns.toEqualTypeOf<number>();
});
