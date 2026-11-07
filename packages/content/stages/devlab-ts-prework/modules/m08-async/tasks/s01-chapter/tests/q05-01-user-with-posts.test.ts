// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { userWithPosts, type User, type Post } from "../src/q05-01-user-with-posts";
test("問1 userWithPosts", async () => {
  const result = await userWithPosts(2);
  expect(result.user).toEqual({ id: 2, name: "佐藤" });
  expect(result.posts.map((p) => p.id)).toEqual([12]);
  await expect(userWithPosts(9)).rejects.toThrow("ユーザー 9 はいません");
  await expect(userWithPosts(3)).rejects.toThrow("投稿を取得できません");
  expectTypeOf(userWithPosts).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(userWithPosts).returns.toEqualTypeOf<Promise<{ user: User; posts: Post[] }>>();
});
