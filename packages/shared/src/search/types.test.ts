import { describe, expect, it } from "vitest";

import {
  buildLikePattern,
  buildPrefixLikePattern,
  escapeLikePattern,
  isSearchableQuery,
  normalizeSearchQuery,
  rankSearchResults,
  type SearchResult,
} from "./types.js";

function result(overrides: Partial<SearchResult> = {}): SearchResult {
  return {
    kind: "stage",
    id: "c1",
    title: "Web開発基礎",
    subtitle: "フロントエンド",
    stage_id: "c1",
    stage_title: "Web開発基礎",
    lesson_type: null,
    ...overrides,
  };
}

describe("normalizeSearchQuery", () => {
  it("前後の空白を落とし、 連続空白を 1 つに畳む", () => {
    expect(normalizeSearchQuery("  React  Hooks  ")).toBe("React Hooks");
  });

  it("改行やタブも空白として扱う", () => {
    expect(normalizeSearchQuery("React\n\tHooks")).toBe("React Hooks");
  });

  it("100 文字を超える入力は切り詰める", () => {
    expect(normalizeSearchQuery("a".repeat(200))).toHaveLength(100);
  });
});

describe("isSearchableQuery", () => {
  it("2 文字以上なら検索する", () => {
    expect(isSearchableQuery("re")).toBe(true);
    expect(isSearchableQuery("React")).toBe(true);
  });

  it("1 文字以下では検索しない", () => {
    expect(isSearchableQuery("")).toBe(false);
    expect(isSearchableQuery("R")).toBe(false);
  });
});

describe("escapeLikePattern", () => {
  it("LIKE のワイルドカードを無効化する", () => {
    expect(escapeLikePattern("100%")).toBe("100\\%");
    expect(escapeLikePattern("a_b")).toBe("a\\_b");
  });

  it("エスケープ文字自体もエスケープする", () => {
    expect(escapeLikePattern("a\\b")).toBe("a\\\\b");
  });

  it("通常の文字は変えない", () => {
    expect(escapeLikePattern("React 基礎")).toBe("React 基礎");
  });
});

describe("buildLikePattern", () => {
  it("部分一致パターンで包む", () => {
    expect(buildLikePattern("React")).toBe("%React%");
  });

  it("ワイルドカードを含む入力でも全件マッチにならない", () => {
    expect(buildLikePattern("%")).toBe("%\\%%");
  });
});

describe("buildPrefixLikePattern", () => {
  it("前方一致パターンを作る", () => {
    expect(buildPrefixLikePattern("React")).toBe("React%");
  });

  it("ワイルドカードを含む入力でも全件マッチにならない", () => {
    expect(buildPrefixLikePattern("%")).toBe("\\%%");
  });
});

describe("rankSearchResults", () => {
  it("前方一致を部分一致より前に出す", () => {
    const ranked = rankSearchResults(
      [
        result({ id: "a", title: "上級React", kind: "lesson", lesson_type: "video" }),
        result({ id: "b", title: "React入門" }),
      ],
      "react",
    );
    expect(ranked.map((r) => r.id)).toEqual(["b", "a"]);
  });

  it("同スコアならステージをレッスンより前に出す", () => {
    const ranked = rankSearchResults(
      [
        result({ id: "l1", kind: "lesson", title: "React Hooks", lesson_type: "video" }),
        result({ id: "c1", kind: "stage", title: "React Hooks" }),
      ],
      "react",
    );
    expect(ranked.map((r) => r.id)).toEqual(["c1", "l1"]);
  });

  it("同スコア・同種別ならタイトル昇順", () => {
    const ranked = rankSearchResults(
      [result({ id: "b", title: "React B" }), result({ id: "a", title: "React A" })],
      "react",
    );
    expect(ranked.map((r) => r.id)).toEqual(["a", "b"]);
  });

  it("入力配列を破壊しない", () => {
    const input = [result({ id: "b", title: "Zebra" }), result({ id: "a", title: "Apple" })];
    rankSearchResults(input, "a");
    expect(input.map((r) => r.id)).toEqual(["b", "a"]);
  });
});
