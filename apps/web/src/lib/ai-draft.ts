import type { Submission } from "@stella/shared/review/types";

/**
 * 講師が開いた時点で AI の下書きがそろっているか。旧形式は講師が開いたときに作る下書き
 * (`aiReady`)、新形式は提出直後の AI 一次レビュー (`aiReviewReady`、結果は `ai_reviews`) を見る。
 * キューの見出しとダッシュボードの「AI下書き準備済」の件数は、どちらもこれで数える。
 */
export function hasAiDraft(submission: Pick<Submission, "aiReady" | "aiReviewReady">): boolean {
  return submission.aiReady || submission.aiReviewReady === true;
}
