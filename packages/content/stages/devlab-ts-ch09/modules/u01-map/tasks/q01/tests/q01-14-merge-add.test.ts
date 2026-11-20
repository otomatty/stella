// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { mergeAdd } from "../src/q01-14-merge-add";
test("問14 mergeAdd", () => {
  const a = new Map([["x", 1]]);
  const b = new Map([
    ["x", 2],
    ["y", 3],
  ]);
  expect([...mergeAdd(a, b).entries()]).toEqual([
    ["x", 3],
    ["y", 3],
  ]);
  expect(a.get("x")).toBe(1);
  expectTypeOf(mergeAdd).parameters.toEqualTypeOf<[Map<string, number>, Map<string, number>]>();
  expectTypeOf(mergeAdd).returns.toEqualTypeOf<Map<string, number>>();
});
