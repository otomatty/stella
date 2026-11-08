// このファイルは書き換えないでください
import { expectTypeOf, test } from "vitest";
import { type ArticleDraft } from "../src/q04-06-article-draft";
test("問6 ArticleDraft", () => {
  expectTypeOf<ArticleDraft>().toEqualTypeOf<{ title: string; body: string; author: string }>();
});
