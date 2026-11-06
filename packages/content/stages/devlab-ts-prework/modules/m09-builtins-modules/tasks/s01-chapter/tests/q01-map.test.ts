import { describe, expect, expectTypeOf, test } from "vitest";
import { groupByLength, mergeCounts, topWords, wordCount } from "../src/q01-map";

describe("wordCount", () => {
  test("単語ごとに数える", () => {
    const counts = wordCount("The cat and the hat");
    expect([...counts.entries()]).toEqual([
      ["the", 2],
      ["cat", 1],
      ["and", 1],
      ["hat", 1],
    ]);
  });

  test("空白や改行が続いても区切れる", () => {
    expect([...wordCount("  a  b\nA \n").entries()]).toEqual([
      ["a", 2],
      ["b", 1],
    ]);
    expect(wordCount("   ").size).toBe(0);
  });

  test("オブジェクトのプロパティ名と同じ単語も数えられる", () => {
    expect(wordCount("constructor constructor").get("constructor")).toBe(2);
  });

  test("型", () => {
    expectTypeOf(wordCount).returns.toEqualTypeOf<Map<string, number>>();
  });
});

describe("topWords", () => {
  test("多い順に上位 n 件。同じ回数なら先に入った順", () => {
    const counts = new Map([
      ["a", 1],
      ["b", 3],
      ["c", 1],
      ["d", 3],
      ["e", 2],
    ]);
    expect(topWords(counts, 3)).toEqual([
      ["b", 3],
      ["d", 3],
      ["e", 2],
    ]);
    expect(topWords(counts, 10)).toHaveLength(5);
    expect([...counts.keys()]).toEqual(["a", "b", "c", "d", "e"]);
  });

  test("型", () => {
    expectTypeOf(topWords).returns.toEqualTypeOf<[string, number][]>();
  });
});

describe("mergeCounts", () => {
  test("同じ単語は足す", () => {
    const a = new Map([
      ["x", 1],
      ["y", 2],
    ]);
    const b = new Map([
      ["z", 5],
      ["x", 3],
    ]);
    expect([...mergeCounts(a, b).entries()]).toEqual([
      ["x", 4],
      ["y", 2],
      ["z", 5],
    ]);
    expect(a.get("x")).toBe(1);
    expect(b.size).toBe(2);
  });

  test("型", () => {
    expectTypeOf(mergeCounts).returns.toEqualTypeOf<Map<string, number>>();
  });
});

describe("groupByLength", () => {
  test("文字数ごとにまとめる", () => {
    const groups = groupByLength(["cat", "horse", "dog", "ox", "zebra"]);
    expect([...groups.entries()]).toEqual([
      [3, ["cat", "dog"]],
      [5, ["horse", "zebra"]],
      [2, ["ox"]],
    ]);
  });

  test("型", () => {
    expectTypeOf(groupByLength).returns.toEqualTypeOf<Map<number, string[]>>();
  });
});
