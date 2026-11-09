// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { toPublicArticle, type Article, type PublicArticle } from "../src/q04-18-to-public-article";
test("問18 toPublicArticle", () => {
  const at = new Date(0);
  expect(
    toPublicArticle({ id: 1, title: "a", body: "x", author: "山田", publishedAt: at }),
  ).toStrictEqual({
    id: 1,
    title: "a",
    author: "山田",
    publishedAt: at,
  });
  expectTypeOf(toPublicArticle).parameters.toEqualTypeOf<[Article]>();
  expectTypeOf(toPublicArticle).returns.toEqualTypeOf<PublicArticle>();
});
