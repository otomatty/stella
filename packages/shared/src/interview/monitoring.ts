/**
 * 面談対策 — 講師・営業のモニタリング一覧の導出 (Issue #236)。
 *
 * 一覧 1 行は「受講者 / 面談日 / 準備率 / 最終練習日」で、 API (集計) と web (表示)
 * の双方がここの純ロジックを共有する。 準備率そのものの導出は `./progress` の
 * `prepRate` に任せ、 ここは **面談日との組み合わせ** — 並び順・注意喚起・残り日数 —
 * だけを持つ。
 *
 * 日付は学習日と同じ `YYYY-MM-DD` (アプリ基準 TZ) の文字列で扱う。 Date に戻すと
 * サーバ (UTC) とブラウザ (JST) で「あと何日」がずれるため、 比較は文字列のまま行う。
 */

import { toStudyDate } from "../study/activity.js";

/** 「面談が近い」の判定に使う残り日数と、 それを下回ると注意喚起する準備率 (%)。 */
export const MONITORING_ALERT_DAYS = 7;
export const MONITORING_ALERT_PERCENT = 60;
export const MONITORING_WATCH_DAYS = 14;
export const MONITORING_WATCH_PERCENT = 80;

/** 面談日と準備率の噛み合わせ。 `alert` = 面談が目前なのに準備率が低い。 */
export type MonitoringRisk = "alert" | "watch" | "none";

export const MONITORING_RISK_LABELS: Record<MonitoringRisk, string> = {
  alert: "要フォロー",
  watch: "気になる",
  none: "",
};

/** モニタリング 1 行の集計値 (API のレスポンスと web の行が共有する形)。 */
export interface MonitoringSummary {
  /** 面談予定日 (`YYYY-MM-DD`)。 未設定は null。 */
  interviewDate: string | null;
  /**
   * 準備率 (%) — 割当範囲の A 必修のうち `練習OK` の割合。
   * 割当を変えた直後など、 サーバの再集計待ちで **まだ分からない** ときは null
   * (0% と区別する — 未算出を「準備できていない」と読ませない)。
   */
  prepPercent: number | null;
  /** 最終練習日時 (ISO)。 一度も練習していなければ null。 */
  lastPracticedAt: string | null;
}

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** `YYYY-MM-DD` をその日の 00:00 の UTC ミリ秒に。 不正値は NaN。 */
function dateToMs(date: string): number {
  const m = DATE_RE.exec(date);
  if (!m) return Number.NaN;
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/**
 * 面談日までの残り日数。 当日は 0、 過ぎていれば負。 未設定 / 不正値は null。
 * `today` もアプリ基準 TZ の `YYYY-MM-DD` (`toStudyDate(Date.now())`)。
 */
export function daysUntilInterview(interviewDate: string | null, today: string): number | null {
  if (!interviewDate) return null;
  const target = dateToMs(interviewDate);
  const base = dateToMs(today);
  if (Number.isNaN(target) || Number.isNaN(base)) return null;
  return Math.round((target - base) / 86_400_000);
}

/** 「あと 3 日」「本日」「2 日前」。 未設定は null。 */
export function formatInterviewCountdown(
  interviewDate: string | null,
  today: string,
): string | null {
  const days = daysUntilInterview(interviewDate, today);
  if (days === null) return null;
  if (days === 0) return "本日";
  if (days > 0) return `あと ${days} 日`;
  return `${Math.abs(days)} 日前`;
}

/**
 * 「準備率が低いまま面談日が近い」行を目立たせるための判定。
 * 面談日が未設定・過ぎている行は対象外 (フォローの余地がない) で `none`。
 * 準備率が未算出 (null) の行も判定を保留して `none`。
 */
export function monitoringRisk(row: MonitoringSummary, today: string): MonitoringRisk {
  const days = daysUntilInterview(row.interviewDate, today);
  if (days === null || days < 0) return "none";
  // 準備率が未算出の行は判定できない (0% 扱いにすると偽の「要フォロー」が出る)。
  if (row.prepPercent === null) return "none";
  if (days <= MONITORING_ALERT_DAYS && row.prepPercent < MONITORING_ALERT_PERCENT) return "alert";
  if (days <= MONITORING_WATCH_DAYS && row.prepPercent < MONITORING_WATCH_PERCENT) return "watch";
  return "none";
}

/**
 * 最終練習日の表示。 練習が無ければ「練習なし」。
 * `lastPracticedAt` は ISO なので、 比較の前にアプリ基準 TZ の日付へ落とす。
 */
export function formatLastPracticed(lastPracticedAt: string | null, today: string): string {
  if (!lastPracticedAt) return "練習なし";
  const at = new Date(lastPracticedAt);
  if (Number.isNaN(at.getTime())) return "練習なし";
  const days = -(daysUntilInterview(toStudyDate(at), today) ?? 0);
  if (days <= 0) return "今日";
  if (days === 1) return "昨日";
  return `${days} 日前`;
}

/**
 * モニタリングの並び順 —— 「面談が近い順」。 3 つに分けて並べる:
 *   1. これからの面談 (当日を含む) を日付の昇順 = 近い順
 *   2. 済んだ面談を日付の降順 (直近に終わったものが上)
 *   3. 面談日が未設定の受講者を表示名順
 *
 * 単純な日付昇順にすると、 面談後に日付が残ったままの受講者が先頭に溜まり、
 * 明日面談する受講者を押し下げてしまう (この画面の目的そのものを損なう)。 済んだ面談は
 * 注意喚起の対象からも外している (`monitoringRisk` / `summarizeMonitoring`) ので、
 * 並び順でも後ろに送る。
 *
 * API の一覧も web の再ソートも同じ順を使う (保存で日付を変えた行がその場で正しい位置へ
 * 動くように、 両方から呼ぶ)。 `today` はアプリ基準 TZ の `YYYY-MM-DD`。
 */
export function sortByInterviewDate<
  T extends { interviewDate?: string | null; display_name?: string },
>(rows: T[], today: string): T[] {
  const byName = (a: T, b: T) => (a.display_name ?? "").localeCompare(b.display_name ?? "");
  const isUpcoming = (r: T) => (daysUntilInterview(r.interviewDate ?? null, today) ?? -1) >= 0;

  const dated = rows.filter((r) => r.interviewDate);
  const upcoming = dated
    .filter(isUpcoming)
    .sort((a, b) => String(a.interviewDate).localeCompare(String(b.interviewDate)) || byName(a, b));
  const past = dated
    .filter((r) => !isUpcoming(r))
    .sort((a, b) => String(b.interviewDate).localeCompare(String(a.interviewDate)) || byName(a, b));
  const undated = rows.filter((r) => !r.interviewDate).sort(byName);
  return [...upcoming, ...past, ...undated];
}

/** 一覧上部の注意喚起チップ。 */
export interface MonitoringTotals {
  /** 一覧の行数 (テナントの受講者数)。 */
  total: number;
  /** 今月まだ来ていない面談の件数 (当日を含む)。 */
  upcomingThisMonth: number;
  /** 一度も練習していない受講者の数。 */
  neverPracticed: number;
  /** `alert` 判定の行数 (面談が目前なのに準備率が低い)。 */
  alerts: number;
}

export function summarizeMonitoring(rows: MonitoringSummary[], today: string): MonitoringTotals {
  const month = today.slice(0, 7);
  let upcomingThisMonth = 0;
  let neverPracticed = 0;
  let alerts = 0;
  for (const row of rows) {
    const days = daysUntilInterview(row.interviewDate, today);
    if (days !== null && days >= 0 && row.interviewDate?.slice(0, 7) === month) {
      upcomingThisMonth += 1;
    }
    if (!row.lastPracticedAt) neverPracticed += 1;
    if (monitoringRisk(row, today) === "alert") alerts += 1;
  }
  return { total: rows.length, upcomingThisMonth, neverPracticed, alerts };
}
