// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { authorInfo, type Article, type AuthorInfo } from "../src/q04-15-author-info";
test("問15 authorInfo", () => {
  const articles: Article[] = [
    { id: 1, title: "a", body: "x", author: "山田", publishedAt: new Date(0) },
    { id: 2, title: "b", body: "y", author: "佐藤", publishedAt: new Date(0) },
    { id: 3, title: "c", body: "z", author: "山田", publishedAt: new Date(0) },
  ];
  expect(authorInfo(articles, "山田")).toEqual({ author: "山田", articleCount: 2 });
  expectTypeOf<AuthorInfo>().toEqualTypeOf<{ author: string } & { articleCount: number }>();
  expectTypeOf(authorInfo).parameters.toEqualTypeOf<[readonly Article[], string]>();
  expectTypeOf(authorInfo).returns.toEqualTypeOf<AuthorInfo>();
});
