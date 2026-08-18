/**
 * 受講登録画面 (`/enrollments`) で共有する型と小物。
 *
 * 画面は「受講生を選ぶ → その受講生に割り当てる教材を決める」の順で操作するため、
 * 受講者 (profile) × コースの割当状況を Map で引けるようにしておく。
 */

import type { AdminProfileRow } from "@/lib/admin-users-api";
import type { EnrollmentRow, EnrollmentStatus } from "@falcon/shared/cms/types";

/** 受講者 1 名分の割当状況 (courseId → enrollment)。 */
export type EnrollmentsByCourse = Map<string, EnrollmentRow>;

/** 受講者 id → その受講者の割当状況。 */
export type EnrollmentIndex = Map<string, EnrollmentsByCourse>;

/** enrollment ステータスを日本語の表示語にする。 */
export const ENROLLMENT_STATUS_LABEL: Record<EnrollmentStatus, string> = {
  active: "受講中",
  completed: "完了",
  expired: "期限切れ",
};

/**
 * 受講者リストの絞り込み軸。
 *
 * スタッフ (講師 / 管理者) への割当は「受講者画面を自分で確認する」ための例外で、
 * 明示的に選んだときだけ対象になる (受講者を対象にする操作が巻き込むことはない)。
 * 選択にスタッフが混ざっているときは右ペインで注意書きを出す。
 */
export type LearnerFilter = "student" | "staff";

/** 教材リストの絞り込み軸。 */
export type CourseFilter = "all" | "assigned" | "unassigned";

/** enrollment 配列を 受講者 id → (コース id → enrollment) に畳む。 */
export function indexEnrollments(rows: EnrollmentRow[]): EnrollmentIndex {
  const index: EnrollmentIndex = new Map();
  for (const row of rows) {
    const byCourse = index.get(row.user_id) ?? new Map<string, EnrollmentRow>();
    byCourse.set(row.course_id, row);
    index.set(row.user_id, byCourse);
  }
  return index;
}

/** timestamptz → `<input type="date">` 用 (YYYY-MM-DD)。 */
export function toDateInput(iso: string | null): string {
  return iso ? iso.slice(0, 10) : "";
}

/** `<input type="date">` の値 → timestamptz (UTC 0 時)。 空なら null。 */
export function fromDateInput(value: string): string | null {
  if (!value) return null;
  const d = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/**
 * 期限切れ (未完了なのに期限日を過ぎている) かどうか。
 *
 * `due_at` は入力日の UTC 0 時なので、 タイムスタンプ同士で比べると期限当日の朝から
 * 超過扱いになってしまう。 受講者ダッシュボードと同じく日付として比べ、 期限当日は
 * まだ超過としない (サーバの集計 `/api/enrollments/summary` とも揃える)。
 */
export function isOverdue(enrollment: EnrollmentRow, today: string): boolean {
  if (!enrollment.due_at || enrollment.status === "completed") return false;
  return enrollment.due_at.slice(0, 10) < today;
}

/** 検索ボックスの入力で受講者を絞り込む (表示名 / メール)。 */
export function matchesProfile(profile: AdminProfileRow, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    profile.display_name.toLowerCase().includes(q) ||
    (profile.email ?? "").toLowerCase().includes(q)
  );
}
