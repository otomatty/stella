/**
 * つまずきの検知 (#38・07 §6.5)。既存の15分の cron で、担当講師に知らせる。
 *
 * 見る合図は次の 3 つ。ヒントを最後まで開く (#36) と、人に回る提出が続く (#33) は後で足す。
 * - 同じ課題で手元の確認の失敗が続く (`task_local_runs`)
 * - 数日進まない (学習の記録が平日 3 日ない)
 * - 確認 B が再提出・不合格になる (同じ課題の後の試行で合格していれば除く)
 *
 * 知らせすぎないよう、通知 ID を出来事ごとに決めて同じ出来事を 2 度送らない。
 * 手元の失敗は、さらに受講者 1 人につき 1 日 1 通にまとめる。
 * 送った出来事は ID を主キーで引いて先に除くので、15分ごとに同じ書き込みを繰り返さない。
 */

import { and, asc, eq, gt, gte, inArray, isNull, lte, notExists, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { addStudyDays, studyDateWeekday, toStudyDate } from "@stella/shared/study/activity";
import type { Db } from "../db/client.js";
import {
  learnerInstructors,
  notifications,
  profiles,
  submissions,
  taskLocalRuns,
  tasks,
} from "../db/schema.js";
import { chunk, D1_MAX_BOUND_PARAMS } from "./enrollment-bulk.js";

/** 同じ課題の同じ版で、続けて失敗した回数の下限。 */
export const LOCAL_FAILURE_STREAK = 5;
/** 連続の失敗がこれより短い間に収まっていれば、試行錯誤の途中とみなして知らせない。 */
export const LOCAL_FAILURE_MIN_SPAN_MS = 60 * 60_000;
/** 学習の記録がない平日の日数。週末は数えない。 */
export const IDLE_WEEKDAYS = 3;
/** 確認 B の判定をさかのぼる期間。導入時に過去の判定をまとめて送らないため。 */
export const ASSESSMENT_B_WINDOW_MS = 3 * 86_400_000;

interface Pair {
  learnerId: string;
  learnerName: string;
  tenantId: string;
  instructorId: string;
  /** 最後に学習した日 (日本時間の YYYY-MM-DD)。記録がなければ空文字。 */
  lastActive: string;
  active: number;
}

/** 担当のある受講者と、最後に学習した日。担当は同じテナントの有効な講師だけ。 */
async function assignedPairs(db: Db): Promise<Pair[]> {
  const instructor = alias(profiles, "instructor");
  const learner = learnerInstructors.learnerId;
  const tenant = profiles.tenantId;
  return db
    .select({
      learnerId: profiles.id,
      learnerName: profiles.displayName,
      tenantId: profiles.tenantId,
      instructorId: instructor.id,
      // 視聴・完了・手元の確認・提出・復習・受講開始のどれもない日を、学習の記録がない日とする。
      lastActive: sql<string>`max(
        coalesce((select max(date) from study_activity where user_id = ${learner} and (watched_sec > 0 or completed_lessons > 0)), ''),
        coalesce((select date(max(last_run_at) / 1000, 'unixepoch', '+9 hours') from task_local_runs where user_id = ${learner}), ''),
        coalesce((select date(max(submitted_at) / 1000, 'unixepoch', '+9 hours') from submissions where tenant_id = ${tenant} and student_id = ${learner}), ''),
        coalesce((select date(max(answered_at) / 1000, 'unixepoch', '+9 hours') from review_logs where user_id = ${learner}), ''),
        coalesce((select date(max(enrolled_at) / 1000, 'unixepoch', '+9 hours') from enrollments where user_id = ${learner} and tenant_id = ${tenant}), '')
      )`,
      active: sql<number>`exists (select 1 from enrollments where user_id = ${learner} and tenant_id = ${tenant} and status = 'active')`,
    })
    .from(learnerInstructors)
    .innerJoin(profiles, eq(profiles.id, learnerInstructors.learnerId))
    .innerJoin(
      instructor,
      and(
        eq(instructor.id, learnerInstructors.instructorId),
        eq(instructor.tenantId, profiles.tenantId),
        eq(instructor.role, "instructor"),
        eq(instructor.disabled, false),
      ),
    )
    .where(eq(profiles.disabled, false))
    .orderBy(asc(learnerInstructors.learnerId));
}

/** `from` の翌日から `to` の前日までの平日の数。`limit` まで数えたら止める。 */
export function weekdaysBetween(from: string, to: string, limit = 31): number {
  let n = 0;
  for (let d = addStudyDays(from, 1), i = 0; d < to && i < 400; d = addStudyDays(d, 1), i++) {
    const w = studyDateWeekday(d);
    if (w !== 0 && w !== 6 && ++n >= limit) break;
  }
  return n;
}

const stumbleId = (signal: string, pair: Pair, key: string) =>
  `stumble:${signal}:${pair.learnerId}:${pair.instructorId}:${key}`;

/** 既に送った通知の ID。主キーで引くだけで、過去の通知は読まない。 */
async function sentIds(db: Db, ids: string[]): Promise<Set<string>> {
  const sent = new Set<string>();
  for (const part of chunk([...new Set(ids)], D1_MAX_BOUND_PARAMS - 10)) {
    const rows = await db
      .select({ id: notifications.id })
      .from(notifications)
      .where(and(eq(notifications.type, "learner_stumble"), inArray(notifications.id, part)));
    for (const row of rows) sent.add(row.id);
  }
  return sent;
}

/** 通知を 1 件入れる。同時に動いた cron が先に入れていれば false。 */
async function insertOnce(db: Db, values: typeof notifications.$inferInsert): Promise<boolean> {
  const inserted = await db
    .insert(notifications)
    .values(values)
    .onConflictDoNothing({ target: notifications.id })
    .returning({ id: notifications.id });
  return inserted.length > 0;
}

async function notifyLocalFailures(db: Db, pairs: Map<string, Pair>, now: Date, today: string) {
  const rows = await db
    .select({
      learnerId: taskLocalRuns.userId,
      tenantId: taskLocalRuns.tenantId,
      taskId: taskLocalRuns.taskId,
      title: tasks.title,
      streak: taskLocalRuns.failureStreak,
      startedAt: taskLocalRuns.streakStartedAt,
    })
    .from(taskLocalRuns)
    .innerJoin(tasks, eq(tasks.id, taskLocalRuns.taskId))
    .where(
      and(
        gte(taskLocalRuns.failureStreak, LOCAL_FAILURE_STREAK),
        isNull(taskLocalRuns.streakAlertedAt),
        lte(taskLocalRuns.streakStartedAt, new Date(now.getTime() - LOCAL_FAILURE_MIN_SPAN_MS)),
      ),
    )
    .orderBy(asc(taskLocalRuns.userId), asc(taskLocalRuns.streakStartedAt));
  const byLearner = new Map<string, { pair: Pair; rows: typeof rows }>();
  for (const row of rows) {
    const pair = pairs.get(row.learnerId);
    if (!pair || pair.tenantId !== row.tenantId) continue;
    const entry = byLearner.get(row.learnerId) ?? { pair, rows: [] };
    entry.rows.push(row);
    byLearner.set(row.learnerId, entry);
  }
  // 1 日 1 通まで。今日すでに送っていれば、残りの課題は翌日に回す (連続が続いていれば)。
  const sent = await sentIds(
    db,
    [...byLearner.values()].map(({ pair }) => stumbleId("local", pair, today)),
  );
  for (const { pair, rows: list } of byLearner.values()) {
    const [first] = list;
    const id = stumbleId("local", pair, today);
    if (!first || sent.has(id)) continue;
    try {
      const rest = list.length - 1;
      const inserted = await insertOnce(db, {
        id,
        userId: pair.instructorId,
        tenantId: pair.tenantId,
        type: "learner_stumble",
        title: `${pair.learnerName}さんが同じ課題でつまずいています`,
        body: `「${first.title}」で手元の確認が${first.streak}回続けて失敗しています${rest > 0 ? `(ほか${rest}件の課題でも続いています)` : ""}。声を掛けるか、講師への相談を勧めてください。`,
        payload: {
          learner_id: pair.learnerId,
          signal: "local-failures",
          task_ids: list.map((r) => r.taskId),
        },
      });
      if (!inserted) continue;
      // 連続の始まりで照合する。知らせる間に合格して数え直した連続には印を付けない。
      const [head, ...tail] = list.flatMap((r) =>
        r.startedAt
          ? [
              db
                .update(taskLocalRuns)
                .set({ streakAlertedAt: now })
                .where(
                  and(
                    eq(taskLocalRuns.userId, pair.learnerId),
                    eq(taskLocalRuns.taskId, r.taskId),
                    eq(taskLocalRuns.streakStartedAt, r.startedAt),
                  ),
                ),
            ]
          : [],
      );
      if (head) await db.batch([head, ...tail]);
    } catch (e) {
      console.error(
        "[cron] stumble notification failed",
        { learnerId: pair.learnerId, signal: "local" },
        e,
      );
    }
  }
}

async function notifyIdle(db: Db, pairs: Pair[], today: string) {
  const idle = pairs.filter(
    (p) =>
      p.active &&
      p.lastActive &&
      weekdaysBetween(p.lastActive, today, IDLE_WEEKDAYS) >= IDLE_WEEKDAYS,
  );
  // 止まった期間ごとに 1 通。学習を再開して再び止まれば、最後の日が変わるので新しい通知になる。
  const sent = await sentIds(
    db,
    idle.map((p) => stumbleId("idle", p, p.lastActive)),
  );
  for (const pair of idle) {
    const id = stumbleId("idle", pair, pair.lastActive);
    if (sent.has(id)) continue;
    try {
      await insertOnce(db, {
        id,
        userId: pair.instructorId,
        tenantId: pair.tenantId,
        type: "learner_stumble",
        title: `${pair.learnerName}さんの学習が止まっています`,
        body: `最後の学習の記録は${pair.lastActive}で、平日${IDLE_WEEKDAYS}日以上記録がありません。声を掛けるか、ペースを相談してください。`,
        payload: { learner_id: pair.learnerId, signal: "idle", last_active: pair.lastActive },
      });
    } catch (e) {
      console.error(
        "[cron] stumble notification failed",
        { learnerId: pair.learnerId, signal: "idle" },
        e,
      );
    }
  }
}

async function notifyAssessmentB(db: Db, pairs: Map<string, Pair>, now: Date) {
  const later = alias(submissions, "later");
  const rows = await db
    .select({
      id: submissions.id,
      learnerId: submissions.studentId,
      tenantId: submissions.tenantId,
      taskId: submissions.taskId,
      title: tasks.title,
      verdict: submissions.verdict,
    })
    .from(submissions)
    .innerJoin(tasks, eq(tasks.id, submissions.taskId))
    .where(
      and(
        eq(submissions.taskKind, "assessment-b"),
        gte(submissions.reviewedAt, new Date(now.getTime() - ASSESSMENT_B_WINDOW_MS)),
        inArray(submissions.verdict, ["resubmit", "fail"]),
        // 同じ課題の後の試行で合格していれば知らせない。課題の進捗 (task_progress) は
        // 一度でも合格すると合格のまま残るので、合格した後に落ちた (後退した) ことを見落とす。
        // 試行の順は提出の保存がロックの中で振る attempt で決める (レビューの確定と同じ順)。
        notExists(
          db
            .select({ one: sql`1` })
            .from(later)
            .where(
              and(
                eq(later.tenantId, submissions.tenantId),
                eq(later.studentId, submissions.studentId),
                eq(later.taskId, submissions.taskId),
                eq(later.verdict, "pass"),
                gt(later.attempt, submissions.attempt),
              ),
            ),
        ),
      ),
    );
  const candidates = rows.flatMap((row) => {
    const pair = row.learnerId ? pairs.get(row.learnerId) : undefined;
    return pair && pair.tenantId === row.tenantId
      ? [{ row, pair, id: stumbleId("assessment-b", pair, row.id) }]
      : [];
  });
  const sent = await sentIds(
    db,
    candidates.map((c) => c.id),
  );
  for (const { row, pair, id } of candidates) {
    if (sent.has(id)) continue;
    try {
      await insertOnce(db, {
        id,
        userId: pair.instructorId,
        tenantId: pair.tenantId,
        type: "learner_stumble",
        title: `${pair.learnerName}さんが確認Bで${row.verdict === "fail" ? "不合格" : "再提出"}になりました`,
        body: `「${row.title}」の定着を確認できませんでした。補習の小問題と、翌日以降の未見の問題で確かめてください。`,
        payload: {
          learner_id: pair.learnerId,
          signal: "assessment-b",
          task_id: row.taskId,
          submission_id: row.id,
        },
      });
    } catch (e) {
      console.error(
        "[cron] stumble notification failed",
        { learnerId: pair.learnerId, signal: "assessment-b" },
        e,
      );
    }
  }
}

/** 15分の cron から呼ぶ。1 つの合図が失敗しても、ほかの合図は続ける。 */
export async function notifyStumbles(db: Db, now = new Date()) {
  const list = await assignedPairs(db);
  if (list.length === 0) return;
  const pairs = new Map(list.map((p) => [p.learnerId, p]));
  const today = toStudyDate(now);
  const results = await Promise.allSettled([
    notifyLocalFailures(db, pairs, now, today),
    notifyIdle(db, list, today),
    notifyAssessmentB(db, pairs, now),
  ]);
  for (const r of results)
    if (r.status === "rejected") console.error("[cron] stumble detection failed", r.reason);
}
