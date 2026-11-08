// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { sortByKey } from "../src/q07-15-sort-by-key";
test("問15 sortByKey", () => {
  expect(sortByKey(["ccc", "a", "bb"], (w) => w.length)).toEqual(["a", "bb", "ccc"]);
  expectTypeOf(sortByKey).parameters.toEqualTypeOf<[readonly string[], (w: string) => number]>();
  expectTypeOf(sortByKey).returns.toEqualTypeOf<string[]>();
});
