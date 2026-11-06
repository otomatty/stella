import { describe, expect, expectTypeOf, test } from "vitest";
import {
  type EditedPost,
  type Meta,
  type Post,
  type SavedPost,
  editPost,
  savePost,
} from "../src/q06-intersection";

const created = new Date("2026-12-01T09:00:00Z");
const updated = new Date("2026-12-02T18:30:00Z");

describe("型", () => {
  test("SavedPost は Post と Meta を合わせた型", () => {
    expectTypeOf<SavedPost>().toEqualTypeOf<Post & Meta>();
  });

  test("EditedPost は SavedPost に updatedAt を足した型", () => {
    expectTypeOf<EditedPost>().toEqualTypeOf<SavedPost & { updatedAt: Date }>();
  });
});

describe("savePost", () => {
  test("id と createdAt を足す", () => {
    expect(savePost({ title: "はじめまして", body: "よろしく" }, 1, created)).toEqual({
      title: "はじめまして",
      body: "よろしく",
      id: 1,
      createdAt: created,
    });
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(savePost).parameters.toEqualTypeOf<[Post, number, Date]>();
    expectTypeOf(savePost).returns.toEqualTypeOf<SavedPost>();
  });
});

describe("editPost", () => {
  test("body を書き換え、updatedAt を足す。元は変えない", () => {
    const saved = savePost({ title: "はじめまして", body: "よろしく" }, 1, created);
    expect(editPost(saved, "よろしくお願いします", updated)).toEqual({
      title: "はじめまして",
      body: "よろしくお願いします",
      id: 1,
      createdAt: created,
      updatedAt: updated,
    });
    expect(saved.body).toBe("よろしく");
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(editPost).parameters.toEqualTypeOf<[SavedPost, string, Date]>();
    expectTypeOf(editPost).returns.toEqualTypeOf<EditedPost>();
  });
});
