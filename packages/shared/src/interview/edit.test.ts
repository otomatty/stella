/**
 * Issue #237 — 想定質問の編集 (admin / 営業) と、 編集で古くなる音声の割り出し。
 */

import { describe, expect, it } from "vitest";

import { interviewAudioTextHash, isInterviewAudioStale } from "./audio";
import {
  INTERVIEW_QUESTION_MAX_LENGTH,
  InterviewQuestionPatchError,
  changedAudioParts,
  normalizeInterviewQuestionPatch,
} from "./edit";

const base = {
  no: 12,
  question: "自己紹介をお願いします",
  deep1: "直近の案件は？ → 規模と役割を先に言う",
  deep2: "",
  deep3: null,
};

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
    expect(normalizeInterviewQuestionPatch({ deep1: "" })).toEqual({ deep1: null });
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

describe("changedAudioParts", () => {
  it("質問文を直したら質問の音声だけ作り直す", () => {
    const { changed, removed } = changedAudioParts(base, { ...base, question: "直した質問" });
    expect(changed).toEqual(["question"]);
    expect(removed).toEqual([]);
  });

  it("深掘りの「→」より後 (対策メモ) だけを直しても音声は作り直さない", () => {
    const after = { ...base, deep1: "直近の案件は？ → メモだけ書き換えた" };
    expect(changedAudioParts(base, after).changed).toEqual([]);
  });

  it("深掘りの読み上げ部分が変われば作り直す", () => {
    const after = { ...base, deep1: "直近の案件を教えてください → 規模と役割を先に言う" };
    expect(changedAudioParts(base, after).changed).toEqual(["deep1"]);
  });

  it("深掘りを空にしたら音声は消す対象になる", () => {
    const { changed, removed } = changedAudioParts(base, { ...base, deep1: "" });
    expect(changed).toEqual([]);
    expect(removed).toEqual(["deep1"]);
  });

  it("深掘りを新しく足したら生成対象になる", () => {
    const after = { ...base, deep2: "チームの規模は？" };
    expect(changedAudioParts(base, after).changed).toEqual(["deep2"]);
  });

  it("読み上げに関係ない項目だけ直しても何も起きない", () => {
    expect(changedAudioParts(base, { ...base })).toEqual({ changed: [], removed: [] });
  });
});

describe("音声の古さ判定", () => {
  it("同じ本文なら古くない", () => {
    expect(isInterviewAudioStale(interviewAudioTextHash("こんにちは"), "こんにちは")).toBe(false);
  });

  it("本文が変われば古い", () => {
    expect(isInterviewAudioStale(interviewAudioTextHash("こんにちは"), "こんばんは")).toBe(true);
  });

  it("指紋を持たない古い音声は「古い」と決めつけない", () => {
    expect(isInterviewAudioStale(undefined, "こんにちは")).toBe(false);
    expect(isInterviewAudioStale(null, "こんにちは")).toBe(false);
    expect(isInterviewAudioStale("", "こんにちは")).toBe(false);
  });

  it("指紋は環境によらず同じ値になる (16 進 8 桁)", () => {
    expect(interviewAudioTextHash("自己紹介をお願いします")).toMatch(/^[0-9a-f]{8}$/);
    expect(interviewAudioTextHash("a")).toBe(interviewAudioTextHash("a"));
    expect(interviewAudioTextHash("a")).not.toBe(interviewAudioTextHash("b"));
  });
});
