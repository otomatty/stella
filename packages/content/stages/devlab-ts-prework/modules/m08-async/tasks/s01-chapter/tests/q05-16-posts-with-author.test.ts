// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { postsWithAuthor } from "../src/q05-16-posts-with-author";
test("問16 postsWithAuthor", async () => {
  const rows = await postsWithAuthor([2, 1]);
  expect(rows[0]).toEqual({ title: "非同期処理のまとめ", author: "佐藤" });
  expect(rows.map((r) => r.author)).toEqual(["佐藤", "山田", "山田", "山田"]);
  await expect(postsWithAuthor([3])).rejects.toThrow("投稿を取得できません");
  expectTypeOf(postsWithAuthor).returns.toEqualTypeOf<
    Promise<{ title: string; author: string }[]>
  >();
});
