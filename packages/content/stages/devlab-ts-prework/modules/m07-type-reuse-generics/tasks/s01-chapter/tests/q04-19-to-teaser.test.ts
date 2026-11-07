// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { toTeaser, type Article, type Teaser } from "../src/q04-19-to-teaser";
test("問19 toTeaser", () => {
  const base: Article = {
    id: 1,
    title: "入門",
    body: "TypeScriptを始めよう",
    author: "山田",
    publishedAt: new Date(0),
  };
  expect(toTeaser(base)).toStrictEqual({ title: "入門", excerpt: "TypeScript…" });
  expect(toTeaser({ ...base, body: "短い" }).excerpt).toBe("短い");
  expectTypeOf(toTeaser).parameters.toEqualTypeOf<[Article]>();
  expectTypeOf(toTeaser).returns.toEqualTypeOf<Teaser>();
});
