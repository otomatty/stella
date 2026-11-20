// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { flattenOnce } from "../src/q08-08-flatten-once";
test("問8 flattenOnce", () => {
  const nested: string[][] = [["a"], ["b", "c"]];
  expect(flattenOnce(nested)).toEqual(["a", "b", "c"]);
  expectTypeOf(flattenOnce(nested)).toEqualTypeOf<string[]>();
});
