// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { allTags } from "../src/q02-19-all-tags";
test("問19 allTags", () => {
  expect(allTags([{ tags: ["ts", "js"] }, { tags: ["js", "css"] }, { tags: [] }])).toEqual([
    "ts",
    "js",
    "css",
  ]);
  expectTypeOf(allTags).parameters.toEqualTypeOf<[{ tags: string[] }[]]>();
  expectTypeOf(allTags).returns.toEqualTypeOf<string[]>();
});
