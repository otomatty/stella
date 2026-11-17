// このファイルは書き換えないでください
import { expectTypeOf, test } from "vitest";
import { type ArticleSummary } from "../src/q04-05-article-summary";
test("問5 ArticleSummary", () => {
  expectTypeOf<ArticleSummary>().toEqualTypeOf<{ id: number; title: string }>();
});
