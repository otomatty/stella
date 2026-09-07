/**
 * 面談対策 — 質問編集フォームの純ロジック (Issue #237)。
 *
 * 画面 (`components/admin/InterviewQuestionEditor.tsx`) から切り出してある。
 * この repo には React の描画テストが無い (vitest は node 環境) ため、
 * 取り違え・競合のような「間違うと気付きにくい」判断はここに置いて単体で試す。
 */

import {
  INTERVIEW_QUESTION_TEXT_FIELDS,
  type InterviewQuestionPatch,
  type InterviewQuestionTextField,
} from "@stella/shared/interview/edit";
import type { StaffInterviewQuestion } from "./interview-prep-api";

export type InterviewQuestionDraft = Record<InterviewQuestionTextField, string> & {
  categories: string[];
  freq: "A" | "B" | "C";
  is_reverse: boolean;
};

export function toDraft(row: StaffInterviewQuestion): InterviewQuestionDraft {
  const draft = {
    categories: [...row.categories],
    freq: row.freq,
    is_reverse: row.is_reverse,
  } as InterviewQuestionDraft;
  for (const field of INTERVIEW_QUESTION_TEXT_FIELDS) {
    draft[field] = row[field] ?? "";
  }
  return draft;
}

/** 案件種別の同値判定 (順序は問わない)。 */
function sameCategories(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((v, i) => v === sortedB[i]);
}

/**
 * 変更のあった項目だけのパッチ。
 *
 * 全項目を送ると、 開いてから保存するまでの間に別の人が直した箇所まで
 * こちらの (開いた時点の) 値で塗り替えてしまう。
 */
export function diffPatch(
  row: StaffInterviewQuestion,
  draft: InterviewQuestionDraft,
): InterviewQuestionPatch {
  const patch: Record<string, unknown> = {};
  for (const field of INTERVIEW_QUESTION_TEXT_FIELDS) {
    if (draft[field].trim() !== (row[field] ?? "").trim()) patch[field] = draft[field];
  }
  if (!sameCategories(draft.categories, row.categories)) patch.categories = draft.categories;
  if (draft.freq !== row.freq) patch.freq = draft.freq;
  if (draft.is_reverse !== row.is_reverse) patch.is_reverse = draft.is_reverse;
  return patch as InterviewQuestionPatch;
}
