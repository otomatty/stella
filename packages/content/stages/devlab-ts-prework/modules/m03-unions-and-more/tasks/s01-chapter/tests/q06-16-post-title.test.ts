// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { postTitle, type Post, type Identified, type Timestamped } from "../src/q06-16-post-title";
test("問16 postTitle", () => {
  expectTypeOf<Post>().toEqualTypeOf<Identified & Timestamped & { title: string }>();
  expect(
    postTitle({ id: 1, createdAt: new Date("2026-12-01T09:00:00Z"), title: "はじめまして" }),
  ).toBe("#1 はじめまして");
  expectTypeOf(postTitle).parameters.toEqualTypeOf<[Post]>();
  expectTypeOf(postTitle).returns.toEqualTypeOf<string>();
});
