// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { nonEmptyLines } from "../src/q08-20-non-empty-lines";
test("問20 nonEmptyLines", () => {
  expect(nonEmptyLines("a\n\n b \n")).toEqual(["a", "b"]);
  expect(nonEmptyLines("")).toEqual([]);
  expectTypeOf(nonEmptyLines).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(nonEmptyLines).returns.toEqualTypeOf<string[]>();
});
