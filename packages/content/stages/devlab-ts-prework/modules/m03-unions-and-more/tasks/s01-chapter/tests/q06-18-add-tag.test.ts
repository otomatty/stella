// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { addTag, type Tagged, type Named } from "../src/q06-18-add-tag";
test("問18 addTag", () => {
  expectTypeOf<Tagged>().toEqualTypeOf<Named & { tags: string[] }>();
  const memo = { name: "メモ", tags: ["a"] };
  expect(addTag(memo, "b")).toEqual({ name: "メモ", tags: ["a", "b"] });
  expect(memo.tags).toEqual(["a"]);
  expectTypeOf(addTag).parameters.toEqualTypeOf<[Tagged, string]>();
  expectTypeOf(addTag).returns.toEqualTypeOf<Tagged>();
});
