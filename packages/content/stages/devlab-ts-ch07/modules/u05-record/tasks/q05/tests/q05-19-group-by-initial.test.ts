// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { groupByInitial } from "../src/q05-19-group-by-initial";
test("問19 groupByInitial", () => {
  expect(groupByInitial(["apple", "avocado", "banana"])).toEqual({
    a: ["apple", "avocado"],
    b: ["banana"],
  });
  expectTypeOf(groupByInitial).parameters.toEqualTypeOf<[readonly string[]]>();
  expectTypeOf(groupByInitial).returns.toEqualTypeOf<Record<string, string[]>>();
});
