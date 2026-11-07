// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { summaries, type Article } from "../src/q04-12-summaries";
test("問12 summaries", () => {
  const articles: Article[] = [
    { id: 1, title: "a", body: "x", author: "山田", publishedAt: new Date(0) },
    { id: 2, title: "b", body: "y", author: "佐藤", publishedAt: new Date(0) },
  ];
  expect(summaries(articles)).toStrictEqual([
    { id: 1, title: "a" },
    { id: 2, title: "b" },
  ]);
  expectTypeOf(summaries).parameters.toEqualTypeOf<[readonly Article[]]>();
  expectTypeOf(summaries).returns.toEqualTypeOf<Pick<Article, "id" | "title">[]>();
});
