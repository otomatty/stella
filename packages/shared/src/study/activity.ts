/**
 * 学習アクティビティ (日別学習ログ) の型と純粋関数 (Issue #73)。
 *
 * `lesson_progress` はレッスンごとの最終状態しか持たないため、 日別の学習量は
 * `study_activity` テーブル (user_id / date / watched_sec / completed_lessons) に
 * 別途 upsert で積み上げる。 ここには API / フロントの双方が使う日付境界の決め方と
 * 系列組み立て・ストリーク算出のロジックだけを置く (I/O は持たない)。
 */

/**
 * 学習日の境界に使うアプリ基準タイムゾーンのオフセット (分)。 Asia/Tokyo = UTC+9。
 *
 * UTC で日付を切ると日本時間の午前 9 時に日付が変わってしまい、 「今日の学習」が
 * 直感と合わなくなるため、 サーバ / クライアントの双方でこのオフセットを使う。
 * (JST は夏時間を持たないので固定オフセットで正しく切れる。)
 */
export const STUDY_TZ_OFFSET_MIN = 9 * 60;

/** 日別学習ログ 1 日分。 `date` はアプリ基準 TZ の `YYYY-MM-DD`。 */
export interface StudyActivityDay {
  date: string;
  watched_sec: number;
  completed_lessons: number;
}

/** `GET /api/study-activity/mine` の戻り値。 */
export interface StudyActivitySummary {
  /** 昇順・欠損日は 0 埋め済みの系列 (末尾が `today`)。 */
  days: StudyActivityDay[];
  /** 今日 (または昨日) から遡った連続学習日数。 */
  current_streak: number;
  /** 記録全体での最長連続学習日数。 */
  longest_streak: number;
  /** `days` の学習秒数合計。 */
  total_sec: number;
  /** 今日の学習秒数。 */
  today_sec: number;
  /** アプリ基準 TZ での今日 (`YYYY-MM-DD`)。 */
  today: string;
  generated_at: string;
}

function formatUtcDate(ms: number): string {
  const d = new Date(ms);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** 時刻をアプリ基準 TZ の `YYYY-MM-DD` に落とす。 */
export function toStudyDate(at: Date | number, offsetMin = STUDY_TZ_OFFSET_MIN): string {
  const ms = typeof at === "number" ? at : at.getTime();
  return formatUtcDate(ms + offsetMin * 60_000);
}

/** `YYYY-MM-DD` を UTC ミリ秒 (その日の 00:00) に。 不正値は NaN。 */
function studyDateToMs(date: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) return Number.NaN;
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/** `YYYY-MM-DD` に日数を加減した日付を返す。 */
export function addStudyDays(date: string, delta: number): string {
  const ms = studyDateToMs(date);
  if (Number.isNaN(ms)) return date;
  return formatUtcDate(ms + delta * 86_400_000);
}

/** `YYYY-MM-DD` の曜日 (0=日曜 … 6=土曜)。 TZ に依存しない。 */
export function studyDateWeekday(date: string): number {
  const ms = studyDateToMs(date);
  if (Number.isNaN(ms)) return 0;
  return new Date(ms).getUTCDay();
}

/** その日に学習があったとみなすか (視聴秒数 or 完了レッスンのいずれかが正)。 */
function isActive(day: Pick<StudyActivityDay, "watched_sec" | "completed_lessons">): boolean {
  return day.watched_sec > 0 || day.completed_lessons > 0;
}

/**
 * DB 行から「`endDate` で終わる `days` 日ぶん・昇順・欠損日 0 埋め」の系列を作る。
 * 範囲外の行は無視し、 同日の重複行は加算する。
 */
export function buildStudySeries(
  rows: readonly StudyActivityDay[],
  endDate: string,
  days: number,
): StudyActivityDay[] {
  const length = Math.max(1, Math.floor(days));
  const byDate = new Map<string, StudyActivityDay>();
  for (let i = length - 1; i >= 0; i--) {
    const date = addStudyDays(endDate, -i);
    byDate.set(date, { date, watched_sec: 0, completed_lessons: 0 });
  }
  for (const row of rows) {
    const slot = byDate.get(row.date);
    if (!slot) continue;
    slot.watched_sec += row.watched_sec;
    slot.completed_lessons += row.completed_lessons;
  }
  return [...byDate.values()];
}

/**
 * 連続学習日数を算出する。
 *
 * - `current`: `today` から遡った連続日数。 その日はまだ学習していないことが普通に
 *   あり得るため、 `today` が空でも前日に学習があればストリークは継続とみなす
 *   (前日も空なら 0)。
 * - `longest`: 記録全体での最長連続日数。
 */
export function computeStreaks(
  rows: readonly StudyActivityDay[],
  today: string,
): { current: number; longest: number } {
  const active = new Set<string>();
  const totals = new Map<string, StudyActivityDay>();
  for (const row of rows) {
    const acc = totals.get(row.date) ?? {
      date: row.date,
      watched_sec: 0,
      completed_lessons: 0,
    };
    acc.watched_sec += row.watched_sec;
    acc.completed_lessons += row.completed_lessons;
    totals.set(row.date, acc);
  }
  for (const day of totals.values()) {
    if (isActive(day)) active.add(day.date);
  }
  if (active.size === 0) return { current: 0, longest: 0 };

  // current: 今日 → なければ昨日を起点に、 連続して学習のある日を遡る。
  let cursor = active.has(today) ? today : addStudyDays(today, -1);
  let current = 0;
  while (active.has(cursor)) {
    current += 1;
    cursor = addStudyDays(cursor, -1);
  }

  // longest: 学習日を昇順に並べ、 前日と連続している間カウントを伸ばす。
  const sorted = [...active].sort();
  let longest = 0;
  let run = 0;
  let prev: string | null = null;
  for (const date of sorted) {
    run = prev !== null && addStudyDays(prev, 1) === date ? run + 1 : 1;
    if (run > longest) longest = run;
    prev = date;
  }

  return { current, longest };
}
