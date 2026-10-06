/**
 * 講師のレビュー画面のキュー (#34、07 §6.4 の 2)。
 *
 * - 人が見る提出 (`needsHumanReview`): 判定前で、AI が確認中でも新しい提出に置き換えたものでもない。
 *   サイドバーの件数・ダッシュボード・キューの見出しは、どれもこれで数える。
 * - AI が確認中の提出は人のキューに数えず、別に並べる (人が先に確定もできる)。
 * - 人に回した理由で分け (`reviewQueueGroup`)、待ち時間・理由・担当者で並べる。
 */

import {
  compareQueueItems,
  type ReviewQueueGroup,
  type ReviewQueueSort,
  reviewQueueGroup,
} from "@stella/shared/review/review-desk";
import type { Submission } from "@stella/shared/review/types";

type QueueFields = Pick<Submission, "status" | "verdict" | "aiReviewStatus">;

/** 人のレビューを待っている提出か。 */
export function needsHumanReview(s: QueueFields): boolean {
  return (
    s.status === "pending" &&
    s.verdict === null &&
    s.aiReviewStatus !== "queued" &&
    s.aiReviewStatus !== "superseded"
  );
}

/** AI が確認している提出か (判定前)。 */
export function isAiChecking(s: QueueFields): boolean {
  return s.status === "pending" && s.verdict === null && s.aiReviewStatus === "queued";
}

/** AI が合格にした提出か (覆したものは含まない)。事後確認の操作を出すのに使う。 */
export function isAiPassed(s: Pick<Submission, "verdict" | "reviewSource" | "taskId">): boolean {
  return Boolean(s.taskId) && s.verdict === "pass" && s.reviewSource === "ai";
}

export function queueGroupOf(s: Pick<Submission, "taskId" | "routeReasons">): ReviewQueueGroup {
  return reviewQueueGroup({ taskId: s.taskId ?? null, routeReasons: s.routeReasons ?? [] });
}

/** キューを並べる。元の配列は変えない。 */
export function sortQueue(rows: Submission[], sort: ReviewQueueSort): Submission[] {
  const compare = compareQueueItems(sort);
  return rows
    .map((s) => ({
      s,
      key: {
        submittedAt: s.submittedAt,
        group: queueGroupOf(s),
        assigneeName: s.assigneeName ?? null,
      },
    }))
    .sort((a, b) => compare(a.key, b.key))
    .map(({ s }) => s);
}

/** 待ち時間の表示 (提出からの経過)。 */
export function formatWaiting(submittedAt: number, now = Date.now()): string {
  const hours = Math.floor((now - submittedAt) / 3_600_000);
  if (hours < 1) return "1時間未満";
  if (hours < 24) return `${hours}時間`;
  return `${Math.floor(hours / 24)}日`;
}
