/**
 * 日別学習ログ (`study_activity`) の加算 (Issue #73)。
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
import type { NormalizedProgressRow } from "@falcon/shared/study/progress-sync";

import type { Db } from "../db/client.js";
import { lessonProgress, studyActivity } from "../db/schema.js";

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
export function buildStudyActivityIncrement(
  db: Db,
  tenantId: string,
  userId: string,
  row: NormalizedProgressRow,
) {
  // 更新前の lesson_progress を参照するスカラサブクエリ群。
  const match = sql`${lessonProgress.userId} = ${userId} and ${lessonProgress.lessonId} = ${row.lessonId}`;
  const prevWatched = sql`coalesce((select ${lessonProgress.watchedSec} from ${lessonProgress} where ${match}), 0)`;
  const prevCompleted = sql`coalesce((select ${lessonProgress.completed} from ${lessonProgress} where ${match}), 0)`;
  // 進捗 upsert の setWhere (excluded.updated_at > 既存) と同じ条件。 既存行が無ければ成立。
  const applies = sql`coalesce((select ${lessonProgress.updatedAt} from ${lessonProgress} where ${match}), -1) < ${row.updatedAtMs}`;

  const watched = row.watchedSec ?? 0;
  const completed = row.completed ? 1 : 0;

  return db
    .insert(studyActivity)
    .values({
      tenantId,
      userId,
      date: row.activityDate,
      watchedSec: sql`case when ${applies} then max(0, ${watched} - ${prevWatched}) else 0 end`,
      completedLessons: sql`case when ${applies} and ${completed} = 1 and ${prevCompleted} = 0 then 1 else 0 end`,
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
