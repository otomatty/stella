// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { publish, type Article } from "../src/q04-11-publish";
test("問11 publish", () => {
  const at = new Date("2026-12-01T09:00:00Z");
  expect(publish({ title: "t", body: "b", author: "a" }, 1, at)).toEqual({
    id: 1,
    title: "t",
    body: "b",
    author: "a",
    publishedAt: at,
  });
  expectTypeOf(publish).parameters.toEqualTypeOf<
    [Omit<Article, "id" | "publishedAt">, number, Date]
  >();
  expectTypeOf(publish).returns.toEqualTypeOf<Article>();
});
