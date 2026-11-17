// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { countMatches } from "../src/q03-02-count-matches";
test("問2 countMatches", () => {
  expect(countMatches(["a", "b", "a"], "a")).toBe(2);
  expect(countMatches([], "a")).toBe(0);
  expectTypeOf(countMatches).parameters.toEqualTypeOf<[readonly string[], string]>();
  expectTypeOf(countMatches).returns.toEqualTypeOf<number>();
});
