/**
 * つまずきの検知 (#38・07 §6.5)。既存の15分の cron で、担当講師に知らせる。
 *
 * 見る合図は次の 4 つ。ヒントを最後まで開く (#36) は後で足す。
 * - 同じ課題で手元の確認の失敗が続く (`task_local_runs`)
 * - 数日進まない (学習の記録が平日 3 日ない)
 * - 確認 B が再提出・不合格になる (同じ課題の後の試行で合格していれば除く)
 * - 人に回る提出が続く (AI の一次レビューが、受講者の取り組みを理由に続けて人に回した)
 *
 * 知らせすぎないよう、通知 ID を出来事ごとに決めて同じ出来事を 2 度送らない。
 * 手元の失敗は、さらに受講者 1 人につき 1 日 1 通にまとめる。
 * 送った出来事は ID を主キーで引いて先に除くので、15分ごとに同じ書き込みを繰り返さない。
 */

import { and, asc, desc, eq, gt, gte, inArray, isNull, lt, lte, notExists, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import type { StumbleSignal } from "@stella/shared/mentoring/weekly-memo";
import { ROUTE_REASON_LABELS, type RouteReason } from "@stella/shared/review/ai-review";
import { addStudyDays, studyDateWeekday, toStudyDate } from "@stella/shared/study/activity";
import type { Db } from "../db/client.js";
import {
  aiReviews,
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
/** 人に回る提出が続く: AI の一次レビューが続けて人に回した提出の数の下限。 */
export const REVIEW_ESCALATION_STREAK = 3;
/**
 * 知らせる続きの、判定が当たった時刻 (`ai_reviews.applied_at`) の期間。続きの中で最後に当たった
 * 判定がこの期間に入るときだけ知らせる。導入時に過去の判定をまとめて送らないため。
 */
export const REVIEW_ESCALATION_WINDOW_MS = 3 * 86_400_000;
/** 続きを数えるためにさかのぼる、提出の日時 (`submitted_at`) の期間。これより前の提出は数えない。 */
export const REVIEW_ESCALATION_LOOKBACK_MS = 30 * 86_400_000;
/**
 * 受講者の取り組みに関わる、人に回した理由。AI や教材の都合 (AI が判定できない・必須の評価項目が
 * 無い・所見の位置ずれ・返信と解答例の重なり) だけで回った提出は、続きに数えも切りもしない。
 * 講師への相談は受講者が自分で選ぶ支援なので、相談の提出はそもそも見ない。
 * CI の照合は、食い違い (失敗した実行・別のコミット・別のワークフロー) だけを数える。照合できない
 * (GitHub の回数制限・不調など) は受講者の取り組みと限らない (07 §5.5)。
 */
export const LEARNER_ESCALATION_REASONS: readonly RouteReason[] = [
  "machine-check",
  "ci-mismatch",
  "unallowed-support",
  "rubric-unmet",
  "rubric-undetermined",
  "low-confidence",
  "task-condition",
];

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

/**
 * 通知 ID の種類の部分。手元の失敗だけは種類の名前 (`local-failures`) と違う `local` のまま
 * (導入時の ID。変えると送った通知を引けなくなり、同じ日に 2 通目を送ってしまう)。
 */
const SIGNAL_ID_SEGMENT: Record<StumbleSignal, string> = {
  "local-failures": "local",
  idle: "idle",
  "assessment-b": "assessment-b",
  "review-escalations": "review-escalations",
};

/**
 * 受講者 1 人・種類 1 つのつまずきの通知 ID の接頭辞 (`stumble:<種類>:<受講者>:`)。
 * 育成メモの材料もこの接頭辞で引く (作る側と読む側で文字列を書き写さない)。
 */
export const stumbleIdPrefix = (signal: StumbleSignal, learnerId: string) =>
  `stumble:${SIGNAL_ID_SEGMENT[signal]}:${learnerId}:`;

const stumbleId = (signal: StumbleSignal, pair: Pair, key: string) =>
  `${stumbleIdPrefix(signal, pair.learnerId)}${pair.instructorId}:${key}`;

/** 受講者 1 人・種類 1 つのつまずきの通知を、主キーの範囲で引く条件 (接頭辞の次の文字の手前まで)。 */
export function stumbleIdRange(signal: StumbleSignal, learnerId: string) {
  const prefix = stumbleIdPrefix(signal, learnerId);
  return and(gte(notifications.id, prefix), lt(notifications.id, `${prefix.slice(0, -1)};`));
}

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
    [...byLearner.values()].map(({ pair }) => stumbleId("local-failures", pair, today)),
  );
  for (const { pair, rows: list } of byLearner.values()) {
    const [first] = list;
    const id = stumbleId("local-failures", pair, today);
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

/**
 * 人に回る提出が続く。受講者の新形式の提出 (相談を除く) に当てた AI の一次レビューを、提出の
 * 新しい順にたどり、AI で確定した提出に当たるまでに、受講者の取り組みを理由に人に回した提出が
 * `REVIEW_ESCALATION_STREAK` 件以上続いていれば知らせる。
 *
 * 続きごとに 1 度。続きの境目は、受講者が最後に AI で確定した提出 (提出の順。30 日より前でも引く)
 * で決める。その境目より後の提出を含む知らせを、この講師にすでに送っていれば送らない (知らせに
 * 続きの最後の提出の日時を残しておき、境目と比べる)。続きの最初の提出で ID を決めると、続きが
 * 30 日の期間を超えたときに最初の提出が期間から落ち、同じ続きを知らせ直してしまう。続きが伸びても
 * 知らせ直さず、AI で合格して切れたあとの新しい続きは改めて知らせる。
 *
 * 時間の軸は 2 つを使い分ける。続きの並びと 30 日の期間は受講者の提出の順 (`submitted_at`) で、
 * 判定がやり直しなどで遅れて当たっても、提出の順は変わらない。「直近 3 日」だけは判定が当たった時刻
 * (`applied_at`) で見る。前の提出の判定が遅れて当たり、そこで続きがそろうこともあるので、続きの中で
 * 最後に当たった判定を起点にする (最新の提出の判定の時刻で見ると、そろった続きを取りこぼす)。
 */
async function notifyReviewEscalations(db: Db, pairs: Map<string, Pair>, now: Date) {
  const applied = and(
    eq(aiReviews.disposition, "applied"),
    eq(submissions.submissionMode, "submit"),
  );
  // 直近に人に回した受講者だけを見る (15分ごとに全員の履歴を読まない)。
  const recent = await db
    .selectDistinct({ learnerId: submissions.studentId, tenantId: submissions.tenantId })
    .from(aiReviews)
    .innerJoin(submissions, eq(submissions.id, aiReviews.submissionId))
    .where(
      and(
        applied,
        eq(aiReviews.outcome, "escalated"),
        gte(aiReviews.appliedAt, new Date(now.getTime() - REVIEW_ESCALATION_WINDOW_MS)),
      ),
    );
  const learners = recent.flatMap((r) => {
    const pair = r.learnerId ? pairs.get(r.learnerId) : undefined;
    return pair && pair.tenantId === r.tenantId ? [pair] : [];
  });
  const candidates: {
    pair: Pair;
    /** 続きの境目 (最後に AI で確定した提出の日時、ミリ秒)。無ければ 0。 */
    segmentStart: number;
    streak: {
      submissionId: string;
      taskId: string | null;
      title: string;
      reasons: RouteReason[];
      submittedAt: Date;
    }[];
  }[] = [];
  // テナントごとに、受講者を 50 人ずつ引く (テナントでも絞り、ほかのテナントの提出を読まない)。
  const byTenant = new Map<string, Pair[]>();
  for (const pair of learners) {
    const list = byTenant.get(pair.tenantId) ?? [];
    list.push(pair);
    byTenant.set(pair.tenantId, list);
  }
  const parts = [...byTenant].flatMap(([tenantId, list]) =>
    chunk(list, 50).map((part) => ({ tenantId, part })),
  );
  for (const { tenantId, part } of parts) {
    const rows = await db
      .select({
        learnerId: submissions.studentId,
        submissionId: submissions.id,
        taskId: submissions.taskId,
        title: submissions.assignmentTitle,
        outcome: aiReviews.outcome,
        reasons: aiReviews.routeReasons,
        appliedAt: aiReviews.appliedAt,
        submittedAt: submissions.submittedAt,
      })
      .from(aiReviews)
      .innerJoin(submissions, eq(submissions.id, aiReviews.submissionId))
      .where(
        and(
          applied,
          eq(submissions.tenantId, tenantId),
          inArray(
            submissions.studentId,
            part.map((p) => p.learnerId),
          ),
          gte(submissions.submittedAt, new Date(now.getTime() - REVIEW_ESCALATION_LOOKBACK_MS)),
        ),
      )
      .orderBy(desc(submissions.submittedAt), desc(aiReviews.appliedAt));
    // 続きの境目 = 受講者が最後に AI で確定した提出の日時。30 日の期間の外にあっても引く。
    const cuts = new Map(
      (
        await db
          .select({
            learnerId: submissions.studentId,
            at: sql<number | null>`max(${submissions.submittedAt})`,
          })
          .from(aiReviews)
          .innerJoin(submissions, eq(submissions.id, aiReviews.submissionId))
          .where(
            and(
              applied,
              eq(aiReviews.outcome, "confirmed"),
              eq(submissions.tenantId, tenantId),
              inArray(
                submissions.studentId,
                part.map((p) => p.learnerId),
              ),
            ),
          )
          .groupBy(submissions.studentId)
      ).flatMap((r) =>
        r.learnerId && r.at !== null ? [[r.learnerId, Number(r.at)] as const] : [],
      ),
    );
    // AI の判定待ち (`queued`) の新形式の提出のうち、いちばん新しいものの日時。判定は提出ごとに別の
    // ジョブで当たるので、提出の順と違う順で当たる。判定待ちを飛び越えて数えると、あとでそれが
    // AI の合格になったとき、続きが無かったことになる。そこで判定待ちに当たったら止め、判定が
    // 当たったあとの cron で改めて数える。置き換え済み (`superseded`) と、人が先に確定した提出
    // (`human`) は判定が当たらないので待たない。提出時に人に回すと決まった提出 (照合の食い違いなど)
    // は `escalated` で、判定が当たっても合格にはならないので、待たずに当たってから数える。
    const waiting = new Map(
      (
        await db
          .select({
            learnerId: submissions.studentId,
            at: sql<number | null>`max(${submissions.submittedAt})`,
          })
          .from(submissions)
          .where(
            and(
              eq(submissions.tenantId, tenantId),
              inArray(
                submissions.studentId,
                part.map((p) => p.learnerId),
              ),
              eq(submissions.submissionMode, "submit"),
              eq(submissions.aiReviewStatus, "queued"),
              gte(submissions.submittedAt, new Date(now.getTime() - REVIEW_ESCALATION_LOOKBACK_MS)),
            ),
          )
          .groupBy(submissions.studentId)
      ).flatMap((r) =>
        r.learnerId && r.at !== null ? [[r.learnerId, Number(r.at)] as const] : [],
      ),
    );
    // 受講者ごとに振り分ける (並びは保つ)。
    const byLearner = new Map<string, typeof rows>();
    for (const row of rows) {
      if (!row.learnerId) continue;
      const list = byLearner.get(row.learnerId) ?? [];
      list.push(row);
      byLearner.set(row.learnerId, list);
    }
    for (const pair of part) {
      // 新しい順。AI で確定した提出で続きが切れる。AI や教材の都合だけで回った提出は飛ばす。
      // 判定待ちの提出より前 (提出の順) には進まない。
      const stopAt = waiting.get(pair.learnerId) ?? Number.NEGATIVE_INFINITY;
      const streak: typeof rows = [];
      const seen = new Set<string>();
      for (const row of byLearner.get(pair.learnerId) ?? []) {
        if (row.submittedAt.getTime() <= stopAt) break;
        if (seen.has(row.submissionId)) continue;
        seen.add(row.submissionId);
        if (row.outcome === "confirmed") break;
        if (row.reasons.some((r) => LEARNER_ESCALATION_REASONS.includes(r))) streak.push(row);
      }
      // 続きがそろった時刻 = 続きの中で最後に当たった判定の時刻。
      const completedAt = Math.max(0, ...streak.map((r) => r.appliedAt?.getTime() ?? 0));
      if (
        streak.length < REVIEW_ESCALATION_STREAK ||
        completedAt < now.getTime() - REVIEW_ESCALATION_WINDOW_MS
      )
        continue;
      candidates.push({
        pair,
        segmentStart: cuts.get(pair.learnerId) ?? 0,
        streak: streak.reverse(),
      });
    }
  }
  for (const { pair, segmentStart, streak } of candidates) {
    const latest = streak[streak.length - 1];
    if (!latest) continue;
    try {
      // 同じ続き (境目より後の提出) をこの講師にすでに知らせていれば送らない。
      const [already] = await db
        .select({ one: sql`1` })
        .from(notifications)
        .where(
          and(
            stumbleIdRange("review-escalations", pair.learnerId),
            eq(notifications.type, "learner_stumble"),
            eq(notifications.userId, pair.instructorId),
            sql`json_extract(${notifications.payload}, '$.last_submitted_at') > ${segmentStart}`,
          ),
        )
        .limit(1);
      if (already) continue;
      const reasons = LEARNER_ESCALATION_REASONS.filter((r) =>
        streak.some((s) => s.reasons.includes(r)),
      ).map((r) => ROUTE_REASON_LABELS[r]);
      // ID は続きの最後の提出で決める (同時に動いた cron の二重の挿入を主キーで防ぐ)。
      const id = stumbleId("review-escalations", pair, latest.submissionId);
      await insertOnce(db, {
        id,
        userId: pair.instructorId,
        tenantId: pair.tenantId,
        type: "learner_stumble",
        title: `${pair.learnerName}さんの提出が続けて講師の確認に回っています`,
        body: `直近の提出${streak.length}件 (最新は「${latest.title}」) が、AIの一次レビューで続けて講師の確認に回りました。理由: ${reasons.join("、")}。課題文やコーディング規則のどこで迷っているかを聞いてください。`,
        payload: {
          learner_id: pair.learnerId,
          signal: "review-escalations",
          submission_ids: streak.map((s) => s.submissionId),
          task_ids: [...new Set(streak.flatMap((s) => (s.taskId ? [s.taskId] : [])))],
          // 続きの最後の提出の日時。次の cron が、同じ続きを知らせたかを境目と比べて決める。
          last_submitted_at: latest.submittedAt.getTime(),
        },
      });
    } catch (e) {
      console.error(
        "[cron] stumble notification failed",
        { learnerId: pair.learnerId, signal: "review-escalations" },
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
    notifyReviewEscalations(db, pairs, now),
  ]);
  for (const r of results)
    if (r.status === "rejected") console.error("[cron] stumble detection failed", r.reason);
}
