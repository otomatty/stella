// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { toSummary, type Article } from "../src/q04-09-to-summary";
test("問9 toSummary", () => {
  const article: Article = {
    id: 1,
    title: "はじめまして",
    body: "本文",
    author: "山田",
    publishedAt: new Date(0),
  };
  expect(toSummary(article)).toStrictEqual({ id: 1, title: "はじめまして" });
  expectTypeOf(toSummary).parameters.toEqualTypeOf<[Article]>();
  expectTypeOf(toSummary).returns.toEqualTypeOf<Pick<Article, "id" | "title">>();
});
