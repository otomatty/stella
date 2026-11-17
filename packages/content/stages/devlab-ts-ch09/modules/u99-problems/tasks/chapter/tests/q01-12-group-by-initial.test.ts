// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { groupByInitial } from "../src/q01-12-group-by-initial";
test("問12 groupByInitial", () => {
  expect([...groupByInitial(["apple", "banana", "avocado"]).entries()]).toEqual([
    ["a", ["apple", "avocado"]],
    ["b", ["banana"]],
  ]);
  expectTypeOf(groupByInitial).returns.toEqualTypeOf<Map<string, string[]>>();
});
