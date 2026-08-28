/**
 * 受講登録ステータスに基づく「ステージの中身を読んでよいか」の判定 (Issue #77)。
 *
 * `completed` を含めるのは、 修了しても教材・資料の閲覧権は残るため。
 * 取り消しは `expired` が担う。 API (認可) とフロント (一覧の絞り込み) の双方が
 * 同じ定義を使うことで、 「一覧には出るが開くと 404」 の不一致を防ぐ。
 *
 * 出題 / 採点 (quiz) は「受講中のみ」の従来判定を維持しており、 ここは使わない。
 */

export type EnrollmentStatus = "active" | "completed" | "expired";

/** ステージの教材・資料を閲覧してよい enrollment ステータス。 */
export const READABLE_ENROLLMENT_STATUSES = ["active", "completed"] as const;

export type ReadableEnrollmentStatus = (typeof READABLE_ENROLLMENT_STATUSES)[number];

/** そのステータスでステージの中身を読んでよいか。 */
export function isReadableEnrollmentStatus(
  status: string | null | undefined,
): status is ReadableEnrollmentStatus {
  return (READABLE_ENROLLMENT_STATUSES as readonly string[]).includes(status ?? "");
}
