import { describe, expect, it } from "vitest";

import { tagMatches, visibleQuestions } from "./filter.js";
import { INTERVIEW_QUESTIONS } from "./questions.js";
import { ASSIGNABLE_CATEGORIES, COMMON_CATEGORY } from "./types.js";

const q = (no: number, categories: string[]) => ({ no, categories });

describe("tagMatches", () => {
  it("完全一致", () => {
    expect(tagMatches("PHP", "PHP")).toBe(true);
  });

  it("下位タグの問題は上位の割当にマッチする", () => {
    expect(tagMatches("PHP/Laravel", "PHP")).toBe(true);
  });

  it("上位タグの問題は下位の割当にマッチする", () => {
    expect(tagMatches("PHP", "PHP/Laravel")).toBe(true);
  });

  it("別系統にはマッチしない", () => {
    expect(tagMatches("PHP", "JS")).toBe(false);
    expect(tagMatches("PHP/Laravel", "JS/React")).toBe(false);
  });

  it("前方一致だけの別タグにはマッチしない (区切りを跨がない)", () => {
    expect(tagMatches("PHPUnit", "PHP")).toBe(false);
  });
});

describe("visibleQuestions", () => {
  const all = [
    q(1, ["PHP"]),
    q(2, ["PHP/Laravel"]),
    q(3, ["JS"]),
    q(4, ["PHP", "JS"]),
    q(5, ["SQL"]),
    q(6, ["テスト"]),
    q(7, [COMMON_CATEGORY]),
  ];

  it("割当なしなら共通タグのみ", () => {
    expect(visibleQuestions(all, []).map((x) => x.no)).toEqual([7]);
  });

  it("言語タグの割当は同言語の下位タグの問題も拾う", () => {
    expect(visibleQuestions(all, ["PHP"]).map((x) => x.no)).toEqual([1, 2, 4, 7]);
  });

  it("FW タグの割当は上位の言語タグの問題も拾う", () => {
    expect(visibleQuestions(all, ["PHP/Laravel"]).map((x) => x.no)).toEqual([1, 2, 4, 7]);
  });

  it("複数タグの問題はいずれかの割当にマッチすれば出る", () => {
    expect(visibleQuestions(all, ["JS"]).map((x) => x.no)).toEqual([3, 4, 7]);
  });

  it("テスト案件の受講者に PHP/JS 向けの問題は出ない (課題①の回帰防止)", () => {
    expect(visibleQuestions(all, ["テスト"]).map((x) => x.no)).toEqual([6, 7]);
  });

  it("未知の割当タグは無視される", () => {
    expect(visibleQuestions(all, ["Java"]).map((x) => x.no)).toEqual([7]);
  });
});

describe("INTERVIEW_QUESTIONS", () => {
  it("175 問で no が一意", () => {
    expect(INTERVIEW_QUESTIONS).toHaveLength(175);
    expect(new Set(INTERVIEW_QUESTIONS.map((d) => d.no)).size).toBe(175);
  });

  it("タグと優先度が既知の値のみ", () => {
    const known = new Set<string>([...ASSIGNABLE_CATEGORIES, COMMON_CATEGORY]);
    for (const d of INTERVIEW_QUESTIONS) {
      expect(d.categories.length, `no=${d.no} の categories が空`).toBeGreaterThan(0);
      for (const tag of d.categories) {
        expect(known, `no=${d.no} の ${tag}`).toContain(tag);
      }
      expect(["A", "B", "C"]).toContain(d.freq);
    }
  });

  it("旧 PHP/JS カテゴリが残っていない", () => {
    const tags = new Set(INTERVIEW_QUESTIONS.flatMap((d) => d.categories));
    expect(tags.has("PHP/JS")).toBe(false);
    expect(tags.has("PHP")).toBe(true);
    expect(tags.has("JS")).toBe(true);
    expect(tags.has("PHP/Laravel")).toBe(true);
  });

  /**
   * 件数チェックだけだと、 問題を別タグへ付け替える取り違えが素通りしてしまう。
   * この講座はデータ移行そのものが成果物なので、 タグの組み合わせ単位で固定する。
   * FW別問題を書き足すときはここの期待値も更新すること。
   */
  it("タグの組み合わせごとの問題数", () => {
    const byTags: Record<string, number> = {};
    for (const d of INTERVIEW_QUESTIONS) {
      const key = d.categories.join(",");
      byTags[key] = (byTags[key] ?? 0) + 1;
    }
    expect(byTags).toEqual({
      SQL: 50,
      テスト: 47,
      全案件共通: 43,
      JS: 12,
      PHP: 11,
      "PHP,JS": 7,
      "PHP/Laravel": 5,
    });
  });

  /**
   * answer_template はプレーンテキスト (Issue #206 で blank span を廃止)。
   * 他フィールドに HTML タグが混ざらないこと。
   */
  it("answer_template に HTML タグが含まれない", () => {
    for (const d of INTERVIEW_QUESTIONS) {
      if (!d.answer_template) continue;
      expect(d.answer_template, `no=${d.no}`).not.toMatch(/<[^>]+>/);
    }
  });
});
