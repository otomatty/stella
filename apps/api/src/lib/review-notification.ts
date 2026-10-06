import type { notifications, submissions } from "../db/schema.js";

type Submission = typeof submissions.$inferSelect;

/**
 * 添削の確定・訂正を受講者に知らせる通知。初回の確定と判定の訂正だけを知らせ、同じ判定の
 * 保存し直しでは増やさない。
 *
 * 遷移は「保存の直前の行」と「いま保存する判定」で決める。ロックの外で読んだ行と保存後に
 * 読み直した行を比べると、同じ提出への確定が重なったとき、両方が「初回」と判断して最後の
 * 判定を 2 回知らせ、途中の判定の通知を落とす。呼び出し側は提出の判定の書き込みを直列化し、
 * その中で読んだ行を渡すこと。
 */
export function reviewNotification(
  before: Pick<
    Submission,
    "id" | "tenantId" | "studentId" | "assignmentTitle" | "stageTitle" | "reviewedAt" | "verdict"
  >,
  verdict: "pass" | "resubmit" | "fail",
): typeof notifications.$inferInsert | null {
  if (!before.studentId) return null;
  const corrected = before.reviewedAt != null;
  if (corrected && before.verdict === verdict) return null;
  return {
    userId: before.studentId,
    tenantId: before.tenantId,
    type: "review_completed",
    title: `${before.assignmentTitle || "課題"} の添削${corrected ? "結果が変更されました" : "が完了しました"}`,
    body:
      verdict === "pass"
        ? "合格しました。 おめでとうございます。"
        : verdict === "resubmit"
          ? "再提出が必要です。 フィードバックを確認してください。"
          : "残念ながら不合格です。 フィードバックを確認してください。",
    payload: {
      submission_id: before.id,
      verdict,
      status: verdict === "pass" ? "passed" : verdict === "fail" ? "failed" : "resubmit",
      stage_title: before.stageTitle,
    },
  };
}
