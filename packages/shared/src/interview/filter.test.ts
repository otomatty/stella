import { describe, expect, it } from "vitest";

import { visibleQuestions } from "./filter.js";
import { INTERVIEW_QUESTIONS } from "./questions.js";

const q = (no: number, category: string) => ({ no, category });

describe("visibleQuestions", () => {
  const all = [q(1, "PHP/JS"), q(2, "SQL"), q(3, "テスト"), q(4, "全案件共通")];

  it("割当なしなら共通カテゴリのみ", () => {
    expect(visibleQuestions(all, []).map((x) => x.no)).toEqual([4]);
  });

  it("割当カテゴリ + 共通を返す", () => {
    expect(visibleQuestions(all, ["PHP/JS"]).map((x) => x.no)).toEqual([1, 4]);
    expect(visibleQuestions(all, ["SQL", "テスト"]).map((x) => x.no)).toEqual([2, 3, 4]);
  });

  it("未知の割当カテゴリは無視される (該当行が無いだけ)", () => {
    expect(visibleQuestions(all, ["Java"]).map((x) => x.no)).toEqual([4]);
  });
});

describe("INTERVIEW_QUESTIONS", () => {
  it("188 問で no が一意", () => {
    expect(INTERVIEW_QUESTIONS).toHaveLength(188);
    expect(new Set(INTERVIEW_QUESTIONS.map((d) => d.no)).size).toBe(188);
  });

  it("カテゴリと優先度が既知の値のみ", () => {
    const cats = new Set(INTERVIEW_QUESTIONS.map((d) => d.category));
    expect([...cats].sort()).toEqual(["PHP/JS", "SQL", "テスト", "全案件共通"].sort());
    for (const d of INTERVIEW_QUESTIONS) {
      expect(["A", "B", "C"]).toContain(d.freq);
    }
  });

  /**
   * web は answer_template を `<span class="blank">` で split して React 要素に
   * 変換する (dangerouslySetInnerHTML を使わない)。 他のタグが混ざると素の
   * テキストとして表示されてしまうため、 データ側で不変条件として縛る。
   */
  it("HTML タグは answer_template の blank span のみ", () => {
    for (const d of INTERVIEW_QUESTIONS) {
      for (const [field, value] of Object.entries(d)) {
        if (typeof value !== "string") continue;
        const tags = value.match(/<[^>]+>/g) ?? [];
        const allowed = field === "answer_template" ? ['<span class="blank">', "</span>"] : [];
        for (const tag of tags) {
          expect(allowed, `${field} (no=${d.no}) の ${tag}`).toContain(tag);
        }
      }
    }
  });
});
