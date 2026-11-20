// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { groupByLength } from "../src/q08-15-group-by-length";
test("問15 groupByLength", () => {
  expect(groupByLength(["a", "bb", "c"])).toEqual({ "1": ["a", "c"], "2": ["bb"] });
  expectTypeOf(groupByLength).parameters.toEqualTypeOf<[readonly string[]]>();
  expectTypeOf(groupByLength).returns.toEqualTypeOf<{ [length: string]: string[] }>();
});
