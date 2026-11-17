import { describe, expect, expectTypeOf, test } from "vitest";
import { type Book, createBook, describeBook } from "../src/q01-object-type";

test("Book の型", () => {
  expectTypeOf<Book>().toEqualTypeOf<{ title: string; author: string; price: number }>();
});

describe("describeBook", () => {
  test("『タイトル』著者（価格）の形にする", () => {
    expect(describeBook({ title: "TypeScript入門", author: "山田", price: 1200 })).toBe(
      "『TypeScript入門』山田（1,200円）",
    );
    expect(describeBook({ title: "React", author: "佐藤", price: 980 })).toBe(
      "『React』佐藤（980円）",
    );
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(describeBook).parameters.toEqualTypeOf<[Book]>();
    expectTypeOf(describeBook).returns.toEqualTypeOf<string>();
  });
});

describe("createBook", () => {
  test("引数から Book を作る", () => {
    expect(createBook("TypeScript入門", "山田", 1200)).toEqual({
      title: "TypeScript入門",
      author: "山田",
      price: 1200,
    });
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(createBook).parameters.toEqualTypeOf<[string, string, number]>();
    expectTypeOf(createBook).returns.toEqualTypeOf<Book>();
  });
});
