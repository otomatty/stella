/**
 * 日別・時間帯別の学習ログの加算。
 *
 * `lesson_progress` の `watched_sec` はレッスンごとの累計 (最大値) であり、 完了フラグも
 * 最終状態しか持たない。 そのため日別の学習量は「進捗 upsert 前後の差分」でしか取れない:
 *
 *   watched_sec  … max(0, 新しい累計 - 既存の累計) を当日分に加算
 *   completed    … 未完了 → 完了に変わったレッスンを 1 件として加算
 *
 * この差分を「アプリ側で SELECT → 計算 → 無条件に加算」してしまうと、 読み取りと書き込みの
 * 間に別リクエスト (マルチタブ / 連続 sync) が割り込んだときに破綻する:
 *
 *   - 進捗 upsert が LWW (`excluded.updated_at > 既存`) で棄却されたのに、 学習ログだけ増える
 *   - 同じ既存値を読んだ複数リクエストがそれぞれ加算し、 実増分より多く積み上がる
 *
 * そこで増分の計算も LWW 判定も **DB 側の式** に閉じ込める。 この文は進捗 upsert と同じ
 * D1 batch (= 暗黙のトランザクション) で、 かつ **進捗 upsert より先に** 実行する必要がある
 * (更新前の `lesson_progress` を読んで増分を出すため)。 SQLite は書き込みを直列化するので、
 * 割り込んだ側は次のトランザクションで更新後の値を基準に増分を出す。
 */

import { sql } from "drizzle-orm";
import { LEGACY_TENANT_ID } from "@stella/shared/legacy-tenant";
import {
  addStudyDays,
  STUDY_TZ_OFFSET_MIN,
  studyActivityScore,
  studyDateStartMs,
  toStudyDate,
  toStudyHour,
} from "@stella/shared/study/activity";
import type { NormalizedProgressRow } from "@stella/shared/study/progress-sync";

import type { Db } from "../db/client.js";
import { lessonProgress, studyActivity, studyActivityHours } from "../db/schema.js";

/** 日別と時間帯別で、進捗の LWW 条件と増分をそろえる。 */
function studyActivityDeltas(userId: string, row: NormalizedProgressRow) {
  const match = sql`${lessonProgress.userId} = ${userId} and ${lessonProgress.lessonId} = ${row.lessonId}`;
  const prevWatched = sql`coalesce((select ${lessonProgress.watchedSec} from ${lessonProgress} where ${match}), 0)`;
  const prevCompleted = sql`coalesce((select ${lessonProgress.completed} from ${lessonProgress} where ${match}), 0)`;
  const applies = sql`coalesce((select ${lessonProgress.updatedAt} from ${lessonProgress} where ${match}), -1) < ${row.updatedAtMs}`;

  return {
    watchedSec: sql`case when ${applies} then max(0, ${row.watchedSec ?? 0} - ${prevWatched}) else 0 end`,
    completedLessons: sql`case when ${applies} and ${row.completed ? 1 : 0} = 1 and ${prevCompleted} = 0 then 1 else 0 end`,
  };
}

/**
 * 進捗 1 行ぶんの「日別ログ加算」文を組み立てて返す (実行はしない)。
 *
 * 加算量は実行時点の `lesson_progress` から計算し、 進捗 upsert 側と同じ LWW 条件で
 * 棄却される場合は 0 になる (= 何も増えない)。
 *
 * 注: INSERT ... VALUES には WHERE を付けられないため、 増分が 0 のときは既存行があれば
 * `setWhere` で更新を見送り、 既存行が無ければ 0 埋めの行が 1 件できる。 0 の日は系列でも
 * ストリークでも「学習なし」として扱うので表示への影響はない。
 */
export function buildStudyActivityIncrement(db: Db, userId: string, row: NormalizedProgressRow) {
  return db
    .insert(studyActivity)
    .values({
      userId,
      date: row.activityDate,
      ...studyActivityDeltas(userId, row),
    })
    .onConflictDoUpdate({
      target: [studyActivity.userId, studyActivity.date],
      set: {
        watchedSec: sql`${studyActivity.watchedSec} + excluded.watched_sec`,
        completedLessons: sql`${studyActivity.completedLessons} + excluded.completed_lessons`,
        updatedAt: new Date(),
      },
      // 増分が 0 なら既存行に触れない (updated_at を無駄に動かさない)。
      setWhere: sql`excluded.watched_sec > 0 or excluded.completed_lessons > 0`,
    });
}

/** 進捗 upsert と同じ batch の中で、upsert より先に実行する。 */
export function buildStudyActivityHourIncrement(
  db: Db,
  userId: string,
  row: NormalizedProgressRow,
) {
  const { watchedSec, completedLessons } = studyActivityDeltas(userId, row);
  const now = Date.now();
  return db
    .insert(studyActivityHours)
    .select(sql`
      select ${crypto.randomUUID()}, ${LEGACY_TENANT_ID}, ${userId}, ${row.activityDate},
        ${toStudyHour(row.updatedAtMs)}, watched_sec, completed_lessons, ${now}, ${now}
      from (select ${watchedSec} watched_sec, ${completedLessons} completed_lessons)
      where watched_sec > 0 or completed_lessons > 0
    `)
    .onConflictDoUpdate({
      target: [studyActivityHours.userId, studyActivityHours.date, studyActivityHours.hour],
      set: {
        watchedSec: sql`${studyActivityHours.watchedSec} + excluded.watched_sec`,
        completedLessons: sql`${studyActivityHours.completedLessons} + excluded.completed_lessons`,
        updatedAt: sql`excluded.updated_at`,
      },
    });
}

export async function loadStudyActivityHours(db: Db, userId: string, weeks: number) {
  const to = toStudyDate(Date.now());
  const from = addStudyDays(to, 1 - weeks * 7);
  const startMs = studyDateStartMs(from);
  const endMs = studyDateStartMs(addStudyDays(to, 1));
  const offset = `+${STUDY_TZ_OFFSET_MIN} minutes`;

  const rows = await db.all<{
    weekday: number | null;
    hour: number | null;
    watched_sec: number;
    completed_lessons: number;
    events: number;
    active_days: number;
    midnight_days: number;
    hours_recorded_since: string | null;
  }>(sql`
    with event_times as (
      select submitted_at as at_ms from quiz_attempts
      where user_id = ${userId} and submitted_at >= ${startMs} and submitted_at < ${endMs}
      union all
      select submitted_at from discovery_attempts
      where user_id = ${userId} and submitted_at >= ${startMs} and submitted_at < ${endMs}
      union all
      select submitted_at from submissions
      where student_id = ${userId} and submitted_at >= ${startMs} and submitted_at < ${endMs}
        and review_source is not 'manual'
      union all
      select opened_at from task_help_opens
      where user_id = ${userId} and opened_at >= ${startMs} and opened_at < ${endMs}
    ), activity as (
      select date, hour, watched_sec, completed_lessons, 0 as events
      from study_activity_hours
      where user_id = ${userId} and date between ${from} and ${to}
        and (watched_sec > 0 or completed_lessons > 0)
      union all
      select date(at_ms / 1000, 'unixepoch', ${offset}),
        cast(strftime('%H', at_ms / 1000, 'unixepoch', ${offset}) as integer), 0, 0, 1
      from event_times
    ), cells as (
      select (cast(strftime('%w', date) as integer) + 6) % 7 as weekday, hour,
        sum(watched_sec) as watched_sec, sum(completed_lessons) as completed_lessons, sum(events) as events
      from activity
      group by weekday, hour
    ), totals as (
      select count(distinct date) as active_days,
        count(distinct case when hour between 0 and 3 then date end) as midnight_days,
        (select min(date) from study_activity_hours) as hours_recorded_since
      from activity
    )
    select cells.*, totals.* from totals left join cells on true
    order by weekday, hour
  `);

  const weekdayTotals = Array<number>(7).fill(0);
  const hourTotals = Array<number>(24).fill(0);
  const cells = rows.flatMap(({ weekday, hour, watched_sec, completed_lessons, events }) => {
    if (weekday === null || hour === null) return [];
    const score = studyActivityScore(watched_sec, completed_lessons, events);
    weekdayTotals[weekday] += score;
    hourTotals[hour] += score;
    return [{ weekday, hour, watched_sec, completed_lessons, events, score }];
  });
  return {
    weeks,
    from,
    to,
    cells,
    weekday_totals: weekdayTotals,
    hour_totals: hourTotals,
    active_days: rows[0]?.active_days ?? 0,
    midnight_days: rows[0]?.midnight_days ?? 0,
    hours_recorded_since: rows[0]?.hours_recorded_since ?? null,
  };
}
