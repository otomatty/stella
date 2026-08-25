/**
 * Issue #237 — 質問編集フォームの純ロジック (差分だけ送る挙動)。
 */

import { describe, expect, it } from "vitest";

import { diffPatch, type InterviewQuestionDraft, toDraft } from "./interview-question-editor";
import type { StaffInterviewQuestion } from "./interview-prep-api";

const row: StaffInterviewQuestion = {
  no: 101,
  categories: ["PHP", "JS"],
  subcategory: "自己紹介",
  freq: "A",
  question: "自己紹介をお願いします",
  time: "30秒",
  keywords: null,
  intent: "基礎",
  answer_template: "共通の型",
  deep1: "直近の案件は？ → 規模と役割を先に言う",
  deep2: null,
  deep3: null,
  ng: null,
  criteria: null,
  is_reverse: false,
  edited_at: null,
  edited_by: null,
};

const draftOf = (over: Partial<InterviewQuestionDraft> = {}): InterviewQuestionDraft => ({
  ...toDraft(row),
  ...over,
});

describe("toDraft", () => {
  it("null の項目は空文字にする (入力欄に null を入れない)", () => {
    const draft = toDraft(row);
    expect(draft.deep2).toBe("");
    expect(draft.question).toBe("自己紹介をお願いします");
  });

  it("案件種別は複製する (チップ操作で元の行を書き換えない)", () => {
    const draft = toDraft(row);
    draft.categories.push("SQL");
    expect(row.categories).toEqual(["PHP", "JS"]);
  });
});

describe("diffPatch", () => {
  it("触っていない項目は送らない (同時に直された箇所を巻き戻さない)", () => {
    expect(diffPatch(row, draftOf())).toEqual({});
  });

  it("変えた項目だけ送る", () => {
    expect(diffPatch(row, draftOf({ question: "直した質問" }))).toEqual({
      question: "直した質問",
    });
  });

  it("前後の空白だけの違いは変更とみなさない", () => {
    expect(diffPatch(row, draftOf({ question: "  自己紹介をお願いします  " }))).toEqual({});
  });

  it("案件種別は順序が変わっただけなら送らない", () => {
    expect(diffPatch(row, draftOf({ categories: ["JS", "PHP"] }))).toEqual({});
  });

  it("案件種別の増減は送る", () => {
    expect(diffPatch(row, draftOf({ categories: ["PHP"] }))).toEqual({ categories: ["PHP"] });
  });

  it("優先度と逆質問フラグの変更も送る", () => {
    expect(diffPatch(row, draftOf({ freq: "B", is_reverse: true }))).toEqual({
      freq: "B",
      is_reverse: true,
    });
  });

  it("空にした項目は空文字で送る (サーバ側で null に正規化される)", () => {
    expect(diffPatch(row, draftOf({ deep1: "" }))).toEqual({ deep1: "" });
  });
});
