import { describe, expect, it } from "vitest";

import {
  SKILL_CHECK_MAX_QUESTIONS,
  SKILL_CHECK_PASS_SCORE,
  selectSkillCheckPaper,
  skillCheckPassed,
  skillCheckPercent,
} from "./skill-check.js";

const pool = (n: number) => Array.from({ length: n }, (_, i) => `q${i}`);

const paper = (over: Partial<Parameters<typeof selectSkillCheckPaper>[0]> = {}) =>
  selectSkillCheckPaper({
    questionIds: pool(40),
    userId: "seed-learner",
    stageId: "id-d",
    attempt: 0,
    ...over,
  });

describe("selectSkillCheckPaper", () => {
  it("同じ (利用者 × ステージ × 受験回数) なら常に同じ受験票", () => {
    expect(paper()).toEqual(paper());
  });

  it("候補の並び順に依存しない (D1 の返す順が変わっても同じ)", () => {
    expect(paper({ questionIds: [...pool(40)].reverse() })).toEqual(paper());
  });

  it("受験回数が進むと別の受験票になる", () => {
    expect(paper({ attempt: 1 })).not.toEqual(paper());
  });

  it("利用者ごとに別の受験票 (隣の人の答えを写せない)", () => {
    expect(paper({ userId: "other" })).not.toEqual(paper());
  });

  it("上限まで、候補が少なければ候補ぶんだけ出す", () => {
    expect(paper()).toHaveLength(SKILL_CHECK_MAX_QUESTIONS);
    expect(paper({ questionIds: pool(6) })).toHaveLength(6);
  });

  it("同じ設問を 2 度出さない (候補が重複していても)", () => {
    const ids = paper({ questionIds: [...pool(12), ...pool(12)] });
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("出すのは候補にある設問だけ", () => {
    const candidates = new Set(pool(40));
    expect(paper().every((id) => candidates.has(id))).toBe(true);
  });

  it("候補が空なら空の受験票", () => {
    expect(paper({ questionIds: [] })).toEqual([]);
  });
});

describe("skillCheckPercent / skillCheckPassed", () => {
  it("合格ラインは 80%", () => {
    expect(SKILL_CHECK_PASS_SCORE).toBe(80);
    expect(skillCheckPassed(8, 10)).toBe(true);
    expect(skillCheckPassed(7, 10)).toBe(false);
  });

  it("端数は四捨五入した % で判定する", () => {
    // 5/6 = 83.3% → 83%
    expect(skillCheckPercent(5, 6)).toBe(83);
    expect(skillCheckPassed(5, 6)).toBe(true);
  });

  it("満点 0 は不合格 (設問の無いステージへ空解答を投げても飛び級できない)", () => {
    expect(skillCheckPercent(0, 0)).toBe(0);
    expect(skillCheckPassed(0, 0)).toBe(false);
  });
});
