// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { searchPosts } from "../src/q05-17-search-posts";
test("問17 searchPosts", async () => {
  await expect(searchPosts([1, 2, 3], "型")).resolves.toEqual(["型注釈のこつ"]);
  await expect(searchPosts([2, 1], "の")).resolves.toEqual(["非同期処理のまとめ", "型注釈のこつ"]);
  expectTypeOf(searchPosts).returns.toEqualTypeOf<Promise<string[]>>();
});
