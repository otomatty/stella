// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import {
  userWithPosts,
  type User,
  type Post,
  postCount,
  postTitles,
  namesOf,
  totalPosts,
  loadedUsers,
  missingIds,
  userSummary,
  commentCount,
  commentsOfUser,
  latestPostTitle,
  postCountsById,
  profileOrNull,
  dashboard,
  mostActive,
  postsWithAuthor,
  searchPosts,
  commentTotal,
  firstAvailableName,
  loadInBatches,
} from "../src/q05-aggregate.drill";

test("問1 userWithPosts", async () => {
  const result = await userWithPosts(2);
  expect(result.user).toEqual({ id: 2, name: "佐藤" });
  expect(result.posts.map((p) => p.id)).toEqual([12]);
  await expect(userWithPosts(9)).rejects.toThrow("ユーザー 9 はいません");
  await expect(userWithPosts(3)).rejects.toThrow("投稿を取得できません");
  expectTypeOf(userWithPosts).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(userWithPosts).returns.toEqualTypeOf<Promise<{ user: User; posts: Post[] }>>();
});

test("問2 postCount", async () => {
  await expect(postCount(1)).resolves.toBe(3);
  await expect(postCount(4)).resolves.toBe(0);
  expectTypeOf(postCount).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(postCount).returns.toEqualTypeOf<Promise<number>>();
});

test("問3 postTitles", async () => {
  await expect(postTitles(2)).resolves.toEqual(["非同期処理のまとめ"]);
  expectTypeOf(postTitles).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(postTitles).returns.toEqualTypeOf<Promise<string[]>>();
});

test("問4 namesOf", async () => {
  await expect(namesOf([3, 1])).resolves.toEqual(["鈴木", "山田"]);
  await expect(namesOf([1, 9])).rejects.toThrow("ユーザー 9 はいません");
  expectTypeOf(namesOf).returns.toEqualTypeOf<Promise<string[]>>();
});

test("問5 totalPosts", async () => {
  await expect(totalPosts([1, 2])).resolves.toBe(4);
  await expect(totalPosts([])).resolves.toBe(0);
  expectTypeOf(totalPosts).returns.toEqualTypeOf<Promise<number>>();
});

test("問6 loadedUsers", async () => {
  const users = await loadedUsers([1, 9, 2]);
  expect(users.map((u) => u.name)).toEqual(["山田", "佐藤"]);
  expectTypeOf(loadedUsers).returns.toEqualTypeOf<Promise<User[]>>();
});

test("問7 missingIds", async () => {
  await expect(missingIds([1, 9, 2, 8])).resolves.toEqual([9, 8]);
  await expect(missingIds([1])).resolves.toEqual([]);
  expectTypeOf(missingIds).returns.toEqualTypeOf<Promise<number[]>>();
});

test("問8 userSummary", async () => {
  await expect(userSummary(1)).resolves.toBe("山田（投稿 3件）");
  await expect(userSummary(4)).resolves.toBe("田中（投稿 0件）");
  expectTypeOf(userSummary).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(userSummary).returns.toEqualTypeOf<Promise<string>>();
});

test("問9 commentCount", async () => {
  await expect(commentCount(10)).resolves.toBe(2);
  await expect(commentCount(11)).resolves.toBe(0);
  expectTypeOf(commentCount).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(commentCount).returns.toEqualTypeOf<Promise<number>>();
});

test("問10 commentsOfUser", async () => {
  await expect(commentsOfUser(1)).resolves.toEqual(["いいですね", "参考になりました", "難しそう"]);
  await expect(commentsOfUser(4)).resolves.toEqual([]);
  expectTypeOf(commentsOfUser).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(commentsOfUser).returns.toEqualTypeOf<Promise<string[]>>();
});

test("問11 latestPostTitle", async () => {
  await expect(latestPostTitle(1)).resolves.toBe("ジェネリクスに挑戦");
  await expect(latestPostTitle(4)).resolves.toBeUndefined();
  expectTypeOf(latestPostTitle).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(latestPostTitle).returns.toEqualTypeOf<Promise<string | undefined>>();
});

test("問12 postCountsById", async () => {
  await expect(postCountsById([1, 2, 3])).resolves.toEqual({ 1: 3, 2: 1 });
  expectTypeOf(postCountsById).returns.toEqualTypeOf<Promise<Record<number, number>>>();
});

test("問13 profileOrNull", async () => {
  const profile = await profileOrNull(2);
  expect(profile?.user.name).toBe("佐藤");
  await expect(profileOrNull(3)).resolves.toBeNull();
  await expect(profileOrNull(9)).resolves.toBeNull();
  expectTypeOf(profileOrNull).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(profileOrNull).returns.toEqualTypeOf<
    Promise<{ user: User; posts: Post[] } | null>
  >();
});

test("問14 dashboard", async () => {
  await expect(dashboard([1, 3, 9, 4])).resolves.toEqual([
    { name: "山田", postCount: 3 },
    { name: "鈴木", postCount: null },
    { name: "田中", postCount: 0 },
  ]);
  expectTypeOf(dashboard).returns.toEqualTypeOf<
    Promise<{ name: string; postCount: number | null }[]>
  >();
});

test("問15 mostActive", async () => {
  await expect(mostActive([2, 1, 4])).resolves.toBe("山田");
  await expect(mostActive([3, 2])).resolves.toBe("佐藤");
  await expect(mostActive([3])).resolves.toBeUndefined();
  expectTypeOf(mostActive).returns.toEqualTypeOf<Promise<string | undefined>>();
});

test("問16 postsWithAuthor", async () => {
  const rows = await postsWithAuthor([2, 1]);
  expect(rows[0]).toEqual({ title: "非同期処理のまとめ", author: "佐藤" });
  expect(rows.map((r) => r.author)).toEqual(["佐藤", "山田", "山田", "山田"]);
  await expect(postsWithAuthor([3])).rejects.toThrow("投稿を取得できません");
  expectTypeOf(postsWithAuthor).returns.toEqualTypeOf<
    Promise<{ title: string; author: string }[]>
  >();
});

test("問17 searchPosts", async () => {
  await expect(searchPosts([1, 2, 3], "型")).resolves.toEqual(["型注釈のこつ"]);
  await expect(searchPosts([2, 1], "の")).resolves.toEqual(["非同期処理のまとめ", "型注釈のこつ"]);
  expectTypeOf(searchPosts).returns.toEqualTypeOf<Promise<string[]>>();
});

test("問18 commentTotal", async () => {
  await expect(commentTotal(1)).resolves.toBe(3);
  await expect(commentTotal(2)).resolves.toBe(1);
  expectTypeOf(commentTotal).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(commentTotal).returns.toEqualTypeOf<Promise<number>>();
});

test("問19 firstAvailableName", async () => {
  await expect(firstAvailableName([9, 8, 2, 1])).resolves.toBe("佐藤");
  await expect(firstAvailableName([9])).resolves.toBeUndefined();
  expectTypeOf(firstAvailableName).returns.toEqualTypeOf<Promise<string | undefined>>();
});

test("問20 loadInBatches", async () => {
  await expect(loadInBatches([1, 2, 3, 4], 3)).resolves.toEqual(["山田", "佐藤", "鈴木", "田中"]);
  await expect(loadInBatches([4, 1], 1)).resolves.toEqual(["田中", "山田"]);
  await expect(loadInBatches([1], 0)).rejects.toThrow(Error);
  expectTypeOf(loadInBatches).returns.toEqualTypeOf<Promise<string[]>>();
});
