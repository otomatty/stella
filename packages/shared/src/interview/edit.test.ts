/**
 * Issue #237 — 想定質問の編集 (admin / 営業) と、 編集で古くなる音声の割り出し。
 */

import { describe, expect, it } from "vitest";

import { interviewAudioTextHash, isInterviewAudioStale } from "./audio";
import {
  INTERVIEW_QUESTION_MAX_LENGTH,
  InterviewQuestionPatchError,
  normalizeInterviewQuestionPatch,
  questionAudioChanged,
} from "./edit";

const base = { no: 12, question: "自己紹介をお願いします" };

describe("normalizeInterviewQuestionPatch", () => {
  it("送った項目だけを含む (未指定は触らない)", () => {
    expect(normalizeInterviewQuestionPatch({ question: "新しい質問" })).toEqual({
      question: "新しい質問",
    });
  });

  it("前後の空白と CRLF を落とす (見えない差分で音声を作り直さない)", () => {
    expect(normalizeInterviewQuestionPatch({ intent: "  意図\r\nの続き  " })).toEqual({
      intent: "意図\nの続き",
    });
  });

  it("必須の質問文は空にできない", () => {
    expect(() => normalizeInterviewQuestionPatch({ question: "   " })).toThrow(
      InterviewQuestionPatchError,
    );
  });

  it("空にできる項目は null になる (seed と同じ表現)", () => {
    expect(normalizeInterviewQuestionPatch({ intent: "" })).toEqual({ intent: null });
  });

  it("NOT NULL の小分類だけは空文字のまま", () => {
    expect(normalizeInterviewQuestionPatch({ subcategory: "" })).toEqual({ subcategory: "" });
  });

  it("上限を超えたら項目名つきで弾く", () => {
    const tooLong = "あ".repeat(INTERVIEW_QUESTION_MAX_LENGTH.question + 1);
    expect(() => normalizeInterviewQuestionPatch({ question: tooLong })).toThrow(/質問文/);
  });

  it("編集できない項目を送ったら弾く (no を変えたつもりを見逃さない)", () => {
    expect(() => normalizeInterviewQuestionPatch({ no: 99 })).toThrow(/no は編集できません/);
  });

  it("選べない案件種別は弾く (誰にも表示されない質問を作らない)", () => {
    expect(() => normalizeInterviewQuestionPatch({ categories: ["Rust"] })).toThrow(/Rust/);
  });

  it("案件種別を空にはできない", () => {
    expect(() => normalizeInterviewQuestionPatch({ categories: [] })).toThrow(/1 つ以上/);
  });

  it("案件種別の重複は畳む", () => {
    expect(normalizeInterviewQuestionPatch({ categories: ["PHP", "PHP"] })).toEqual({
      categories: ["PHP"],
    });
  });

  it("優先度と逆質問フラグは型を検査する", () => {
    expect(normalizeInterviewQuestionPatch({ freq: "B" })).toEqual({ freq: "B" });
    expect(() => normalizeInterviewQuestionPatch({ freq: "D" })).toThrow(/A \/ B \/ C/);
    expect(() => normalizeInterviewQuestionPatch({ is_reverse: "yes" })).toThrow(/真偽値/);
  });

  it("中身が空のパッチは弾く", () => {
    expect(() => normalizeInterviewQuestionPatch({})).toThrow(/更新する項目がありません/);
    expect(() => normalizeInterviewQuestionPatch(null)).toThrow(/更新内容が不正です/);
  });
});

describe("questionAudioChanged", () => {
  it("質問文が変われば音声を作り直す", () => {
    expect(questionAudioChanged(base.question, "直した質問")).toBe(true);
  });

  it("質問文が同じなら作り直さない (意図や評価軸だけの編集)", () => {
    expect(questionAudioChanged(base.question, base.question)).toBe(false);
  });
});

describe("音声の古さ判定", () => {
  it("同じ本文なら古くない", () => {
    expect(isInterviewAudioStale(interviewAudioTextHash("こんにちは"), "こんにちは")).toBe(false);
  });

  it("本文が変われば古い", () => {
    expect(isInterviewAudioStale(interviewAudioTextHash("こんにちは"), "こんばんは")).toBe(true);
  });

  it("指紋を持たない音声は古いとみなす (検証できないものを受講者へ渡さない)", () => {
    expect(isInterviewAudioStale(undefined, "こんにちは")).toBe(true);
    expect(isInterviewAudioStale(null, "こんにちは")).toBe(true);
    expect(isInterviewAudioStale("", "こんにちは")).toBe(true);
  });

  it("指紋は環境によらず同じ値になる (16 進 8 桁)", () => {
    expect(interviewAudioTextHash("自己紹介をお願いします")).toMatch(/^[0-9a-f]{8}$/);
    expect(interviewAudioTextHash("a")).toBe(interviewAudioTextHash("a"));
    expect(interviewAudioTextHash("a")).not.toBe(interviewAudioTextHash("b"));
  });
});
