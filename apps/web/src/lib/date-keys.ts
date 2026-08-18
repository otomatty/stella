/**
 * 日付キー (YYYY-MM-DD) のユーティリティ。
 *
 * 期限 (`enrollments.due_at`) は入力日の UTC 0 時で保存され、 画面もサーバ集計も
 * 「日付」 として比較する。 基準となる「今日」は利用者のローカル暦日に揃える
 * (受講者ダッシュボードの 「本日まで」 と同じ基準)。
 */

/** 今日のローカル暦日 (YYYY-MM-DD)。 */
export function todayDateKey(): string {
  const now = new Date();
  const m = `${now.getMonth() + 1}`.padStart(2, "0");
  const d = `${now.getDate()}`.padStart(2, "0");
  return `${now.getFullYear()}-${m}-${d}`;
}
