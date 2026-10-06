/**
 * 課題ごとの支援の記録と、手元の確認の要約 (#38・07 §6.5)。
 *
 * - 手元の確認は受講者・課題ごとに回数だけを持つ (`task_local_runs`)。
 * - 支援の記録は、提出に添えた支援・相談・人のレビュー・サーバーの記録 (`task_support_events`) を
 *   課題ごとに束ねて返す。正本が既にあるもの (相談・レビュー) は写さず、読むときに束ねる。
 */

import { and, desc, eq, lt, lte, sql } from "drizzle-orm";
import type { LocalRunReport } from "@stella/shared/tasks/local-report";
import type { TaskKind } from "@stella/shared/tasks/manifest";
import { SUPPORT_KINDS } from "@stella/shared/tasks/submission-support";
import {
  CONSULT_SUPPORT_DETAIL,
  RECORDED_SUPPORT_KINDS,
  type EvidenceLevel,
  type RecordedSupportKind,
  type SupportRecordEvent,
  type SupportRecordKind,
  type TaskSupportRecord,
} from "@stella/shared/tasks/support-record";
import type { Db } from "../db/client.js";
import {
  sections,
  skillEvidence,
  stages,
  submissionReviews,
  submissions,
  taskLocalRuns,
  taskSupportEvents,
  tasks,
} from "../db/schema.js";

/** 1 課題あたりに返す記録の件数。回数 (`counts`) は全件で数える。 */
const EVENTS_PER_TASK = 50;
const DETAIL_MAX = 200;

/**
 * 手元の確認 1 回ぶんを要約に足す 1 文。同じ組の同時の報告も 1 文ずつ原子的に積まれる。
 * 版が変わったら連続の失敗を数え直す (古い版のテストでの失敗と混ぜない)。
 */
export function localRunUpsert(
  db: Db,
  owner: { userId: string; tenantId: string },
  task: { id: string; contentHash: string },
  report: Pick<LocalRunReport, "outcome" | "failedSteps" | "tests">,
  now = new Date(),
) {
  const t = taskLocalRuns;
  const failed = report.outcome === "failed";
  const same = sql`${t.contentHash} = excluded.content_hash`;
  // 合格で連続が切れる。エラー (環境の問題) は数えず、連続も切らない。
  const streak =
    report.outcome === "passed"
      ? sql`0`
      : failed
        ? sql`(case when ${same} then ${t.failureStreak} else 0 end) + 1`
        : sql`case when ${same} then ${t.failureStreak} else 0 end`;
  const keepStreak =
    report.outcome === "passed" ? sql`0` : failed ? sql`${same} and ${t.failureStreak} > 0` : same;
  return db
    .insert(t)
    .values({
      userId: owner.userId,
      taskId: task.id,
      tenantId: owner.tenantId,
      contentHash: task.contentHash,
      passedRuns: report.outcome === "passed" ? 1 : 0,
      failedRuns: failed ? 1 : 0,
      errorRuns: report.outcome === "error" ? 1 : 0,
      failureStreak: failed ? 1 : 0,
      streakStartedAt: failed ? now : null,
      streakAlertedAt: null,
      lastOutcome: report.outcome,
      lastFailedSteps: report.failedSteps,
      lastTestsPassed: report.tests?.passed ?? null,
      lastTestsFailed: report.tests?.failed ?? null,
      firstRunAt: now,
      lastRunAt: now,
    })
    .onConflictDoUpdate({
      target: [t.userId, t.taskId],
      set: {
        passedRuns: sql`${t.passedRuns} + excluded.passed_runs`,
        failedRuns: sql`${t.failedRuns} + excluded.failed_runs`,
        errorRuns: sql`${t.errorRuns} + excluded.error_runs`,
        failureStreak: streak,
        streakStartedAt: sql`case when ${keepStreak} then ${t.streakStartedAt} else excluded.streak_started_at end`,
        streakAlertedAt: sql`case when ${keepStreak} then ${t.streakAlertedAt} else null end`,
        contentHash: sql`excluded.content_hash`,
        lastOutcome: sql`excluded.last_outcome`,
        lastFailedSteps: sql`excluded.last_failed_steps`,
        lastTestsPassed: sql`excluded.last_tests_passed`,
        lastTestsFailed: sql`excluded.last_tests_failed`,
        lastRunAt: sql`excluded.last_run_at`,
      },
    });
}

/** サーバーが見た支援を 1 件残す。種類は `RECORDED_SUPPORT_KINDS` に限る。 */
export async function recordSupportEvent(
  db: Db,
  event: {
    tenantId: string;
    userId: string;
    taskId: string;
    kind: RecordedSupportKind;
    detail?: string;
  },
) {
  if (!(RECORDED_SUPPORT_KINDS as readonly string[]).includes(event.kind))
    throw new Error(`unknown support kind: ${event.kind}`);
  await db.insert(taskSupportEvents).values({
    tenantId: event.tenantId,
    userId: event.userId,
    taskId: event.taskId,
    kind: event.kind,
    detail: event.detail?.slice(0, DETAIL_MAX) ?? null,
    createdAt: new Date(),
  });
}

/**
 * 提出の申告 (`support_log`) と相談の提出のほかに、この提出より前に支援を受けていたか。
 * サーバーの記録 (AI チャットなど) と、同じ課題での講師への相談を数える。
 * 人のレビューは数えない — 再提出の指摘を受けて直すのは通常の流れで、支援付きにすると
 * 一度で通らなかった提出がすべて支援付きになるため (03 §7 の「講師による実装指示」とは別)。
 */
export async function hasRecordedSupport(
  db: Db,
  row: { tenantId: string; studentId: string; taskId: string; submittedAt: Date },
): Promise<boolean> {
  const [recorded] = await db
    .select({ one: sql`1` })
    .from(taskSupportEvents)
    .where(
      and(
        eq(taskSupportEvents.tenantId, row.tenantId),
        eq(taskSupportEvents.userId, row.studentId),
        eq(taskSupportEvents.taskId, row.taskId),
        lte(taskSupportEvents.createdAt, row.submittedAt),
      ),
    )
    .limit(1);
  if (recorded) return true;
  const [consulted] = await db
    .select({ one: sql`1` })
    .from(submissions)
    .where(
      and(
        eq(submissions.tenantId, row.tenantId),
        eq(submissions.studentId, row.studentId),
        eq(submissions.taskId, row.taskId),
        eq(submissions.submissionMode, "consult"),
        lt(submissions.submittedAt, row.submittedAt),
      ),
    )
    .limit(1);
  return Boolean(consulted);
}

const LEVEL_RANK: Record<EvidenceLevel, number> = { supported: 0, independent: 1, retained: 2 };
const VERDICT_LABELS = { pass: "合格", resubmit: "再提出", fail: "不合格" } as const;

/**
 * 受講者 1 人の課題ごとの支援の記録。`stageId` を渡すとそのステージの有効な課題をすべて返し、
 * 省略すると記録のある課題だけを返す。認可は呼び出し側で済ませる。
 *
 * どの読み出しも課題 → 単元 → ステージで同じテナントに絞る (課題表はテナントを持たない)。
 */
export async function loadTaskSupport(
  db: Db,
  scope: { tenantId: string; userId: string; stageId?: string },
): Promise<TaskSupportRecord[]> {
  const where = and(
    eq(stages.tenantId, scope.tenantId),
    scope.stageId ? eq(sections.stageId, scope.stageId) : undefined,
  );
  const meta = {
    taskId: tasks.id,
    title: tasks.title,
    kind: tasks.kind,
    skills: tasks.skills,
    stageId: stages.id,
    stageTitle: stages.title,
    order: sql<number>`${sections.order} * 100000 + ${tasks.order}`,
  };
  const [stageTasks, submitted, reviews, recorded, runs, evidence] = await Promise.all([
    scope.stageId
      ? db
          .select(meta)
          .from(tasks)
          .innerJoin(sections, eq(sections.id, tasks.sectionId))
          .innerJoin(stages, eq(stages.id, sections.stageId))
          .where(and(where, eq(tasks.active, true)))
      : Promise.resolve([]),
    db
      .select({
        ...meta,
        mode: submissions.submissionMode,
        supportLog: submissions.supportLog,
        submittedAt: submissions.submittedAt,
      })
      .from(submissions)
      .innerJoin(tasks, eq(tasks.id, submissions.taskId))
      .innerJoin(sections, eq(sections.id, tasks.sectionId))
      .innerJoin(stages, eq(stages.id, sections.stageId))
      .where(
        and(
          where,
          eq(submissions.tenantId, scope.tenantId),
          eq(submissions.studentId, scope.userId),
        ),
      ),
    db
      .select({ ...meta, verdict: submissionReviews.verdict, at: submissionReviews.createdAt })
      .from(submissionReviews)
      .innerJoin(submissions, eq(submissions.id, submissionReviews.submissionId))
      .innerJoin(tasks, eq(tasks.id, submissions.taskId))
      .innerJoin(sections, eq(sections.id, tasks.sectionId))
      .innerJoin(stages, eq(stages.id, sections.stageId))
      .where(
        and(
          where,
          eq(submissionReviews.source, "human"),
          eq(submissions.tenantId, scope.tenantId),
          eq(submissions.studentId, scope.userId),
        ),
      ),
    db
      .select({
        ...meta,
        kind: taskSupportEvents.kind,
        taskKind: tasks.kind,
        detail: taskSupportEvents.detail,
        at: taskSupportEvents.createdAt,
      })
      .from(taskSupportEvents)
      .innerJoin(tasks, eq(tasks.id, taskSupportEvents.taskId))
      .innerJoin(sections, eq(sections.id, tasks.sectionId))
      .innerJoin(stages, eq(stages.id, sections.stageId))
      .where(
        and(
          where,
          eq(taskSupportEvents.tenantId, scope.tenantId),
          eq(taskSupportEvents.userId, scope.userId),
        ),
      ),
    db
      .select({ ...meta, run: taskLocalRuns })
      .from(taskLocalRuns)
      .innerJoin(tasks, eq(tasks.id, taskLocalRuns.taskId))
      .innerJoin(sections, eq(sections.id, tasks.sectionId))
      .innerJoin(stages, eq(stages.id, sections.stageId))
      .where(
        and(
          where,
          eq(taskLocalRuns.tenantId, scope.tenantId),
          eq(taskLocalRuns.userId, scope.userId),
        ),
      ),
    db
      .select({
        ...meta,
        level: skillEvidence.level,
        submissionId: submissions.id,
        submittedAt: submissions.submittedAt,
      })
      .from(skillEvidence)
      .innerJoin(submissions, eq(submissions.id, skillEvidence.submissionId))
      .innerJoin(tasks, eq(tasks.id, submissions.taskId))
      .innerJoin(sections, eq(sections.id, tasks.sectionId))
      .innerJoin(stages, eq(stages.id, sections.stageId))
      .where(
        and(
          where,
          eq(skillEvidence.tenantId, scope.tenantId),
          eq(skillEvidence.userId, scope.userId),
          eq(submissions.studentId, scope.userId),
        ),
      )
      .orderBy(desc(submissions.submittedAt)),
  ]);

  type Meta = { [K in keyof typeof meta]: (typeof stageTasks)[number][K] };
  const records = new Map<
    string,
    TaskSupportRecord & { order: number; all: SupportRecordEvent[]; seen: Set<string> }
  >();
  const recordOf = (m: Meta) => {
    let r = records.get(m.taskId);
    if (!r) {
      r = {
        taskId: m.taskId,
        title: m.title,
        kind: m.kind as TaskKind,
        stageId: m.stageId,
        stageTitle: m.stageTitle,
        assessesSkills: m.skills.assesses.length > 0,
        level: null,
        counts: {},
        events: [],
        localRuns: null,
        order: m.order,
        all: [],
        seen: new Set(),
      };
      records.set(m.taskId, r);
    }
    return r;
  };
  const push = (r: ReturnType<typeof recordOf>, event: SupportRecordEvent) => {
    // 同じ支援の記録は試行ごとの提出に繰り返し載るので、種類と時刻で 1 件にまとめる。
    const key = `${event.source}|${event.kind}|${event.at}`;
    if (r.seen.has(key)) return;
    r.seen.add(key);
    r.all.push(event);
  };

  for (const t of stageTasks) recordOf(t);
  for (const s of submitted) {
    const r = recordOf(s);
    if (s.mode === "consult")
      push(r, { kind: "consult", at: s.submittedAt.toISOString(), source: "submission" });
    for (const e of s.supportLog ?? []) {
      if (!(SUPPORT_KINDS as readonly string[]).includes(e.kind)) continue;
      // 相談の提出に拡張が足す「講師への相談」は、上の相談そのものと同じ出来事。
      if (s.mode === "consult" && e.kind === "instructor" && e.detail === CONSULT_SUPPORT_DETAIL)
        continue;
      const at = new Date(e.at);
      if (Number.isNaN(at.getTime())) continue;
      push(r, {
        kind: e.kind,
        at: at.toISOString(),
        source: "declared",
        ...(e.detail ? { detail: e.detail.slice(0, DETAIL_MAX) } : {}),
      });
    }
  }
  for (const v of reviews)
    push(recordOf(v), {
      kind: "human-review",
      at: v.at.toISOString(),
      source: "submission",
      detail: VERDICT_LABELS[v.verdict],
    });
  for (const e of recorded)
    push(recordOf({ ...e, kind: e.taskKind }), {
      kind: e.kind as SupportRecordKind,
      at: e.at.toISOString(),
      source: "recorded",
      ...(e.detail ? { detail: e.detail } : {}),
    });
  for (const { run, ...m } of runs) {
    recordOf(m).localRuns = {
      passed: run.passedRuns,
      failed: run.failedRuns,
      error: run.errorRuns,
      failureStreak: run.failureStreak,
      lastOutcome: run.lastOutcome,
      lastFailedSteps: run.lastFailedSteps,
      lastTests:
        run.lastTestsPassed === null || run.lastTestsFailed === null
          ? null
          : { passed: run.lastTestsPassed, failed: run.lastTestsFailed },
      lastRunAt: run.lastRunAt.toISOString(),
    };
  }
  // 最も新しい合格の証拠だけを見る。スキルごとに水準が違えば低い方を出す (高く見せない)。
  const latest = new Map<string, string>();
  for (const e of evidence) {
    if (!latest.has(e.taskId)) latest.set(e.taskId, e.submissionId);
    if (latest.get(e.taskId) !== e.submissionId) continue;
    const r = recordOf(e);
    const level = e.level as EvidenceLevel;
    if (!r.level || LEVEL_RANK[level] < LEVEL_RANK[r.level]) r.level = level;
  }

  return [...records.values()]
    .sort((a, b) =>
      a.stageId === b.stageId ? a.order - b.order : a.stageTitle.localeCompare(b.stageTitle, "ja"),
    )
    .map(({ order: _order, all, seen: _seen, ...r }) => {
      const counts: TaskSupportRecord["counts"] = {};
      for (const e of all) counts[e.kind] = (counts[e.kind] ?? 0) + 1;
      return {
        ...r,
        counts,
        events: all.sort((a, b) => b.at.localeCompare(a.at)).slice(0, EVENTS_PER_TASK),
      };
    });
}
